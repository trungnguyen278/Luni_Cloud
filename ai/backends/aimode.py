"""
PRIMARY — Google AI Mode via Playwright (headless Chromium).

Drives Google Search's AI Mode surface (udm=50) and scrapes the rendered answer.
Design:
  - ONE persistent browser + context launched at FastAPI startup (lifespan) so the
    consent cookie survives and we don't pay browser-launch cost per request.
  - An asyncio.Semaphore(1) serializes requests (one shared context).
  - Fail-fast: short timeouts so failures fall through to Gemini quickly.

IMPORTANT: Google's DOM is unstable and there is no official API. The answer-
container selectors below are best-effort and will likely need tuning against the
live page (run with AIMODE_HEADLESS=false to inspect). If extraction yields
nothing, chat() raises and the orchestrator falls back to Gemini — so a wrong
selector degrades gracefully rather than speaking page chrome.
"""

import asyncio
from urllib.parse import quote_plus

import structlog

import persona
from config import settings

logger = structlog.get_logger()

DESKTOP_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Tried in order; first that yields a clean answer >=40 chars wins. ONLY precise
# AI-Mode answer containers here — NOT broad results columns (#rso/#search), which
# would make the robot read web-results chrome. If none match, AI Mode "fails" and
# the orchestrator falls through to the (clean) Gemini/gemma backups.
# Override via AIMODE_ANSWER_SELECTORS env if Google's markup changes.
_DEFAULT_ANSWER_SELECTORS = [
    '[data-subtree="aimc"]',          # AI Mode answer container (verified live)
    'div[data-async-context*="ai"]',  # alternate AI container
]

# If the scraped text contains these, it's a web-results surface, not an AI
# answer — reject it so we fall back instead of speaking page chrome.
_REJECT_MARKERS = [
    "kết quả hàng đầu trên web",
    "sau đây là những kết quả",
    "results from the web",
]

# AI Mode footer/echo noise to strip from the scraped answer.
_DISCLAIMERS = [
    "AI có thể mắc sai sót",
    "AI responses may include mistakes",
    "AI can make mistakes",
]


def _clean(text: str) -> str:
    """Strip the 'Bạn đã nói' echo prefix and the trailing AI disclaimer."""
    s = (text or "").strip()
    # Drop a leading "Bạn đã nói:" echo block if a broad container was matched.
    marker = "Bạn đã nói:"
    if s.startswith(marker):
        nl = s.find("\n")
        if nl != -1:
            s = s[nl + 1:].lstrip()
    # Cut everything from the disclaimer footer onward.
    low = s.lower()
    for d in _DISCLAIMERS:
        i = low.find(d.lower())
        if i != -1:
            s = s[:i].strip()
            low = s.lower()
    return s


def _looks_like_results(s: str) -> bool:
    low = s.lower()
    return any(m in low for m in _REJECT_MARKERS)


_CONSENT_SELECTORS = [
    'button:has-text("Reject all")',
    'button:has-text("Từ chối tất cả")',
    'button:has-text("Accept all")',
    'button:has-text("Chấp nhận tất cả")',
    'button[aria-label*="Reject"]',
    'button[aria-label*="Accept"]',
    'form[action*="consent"] button',
]


class AIModeBackend:
    name = "aimode"

    def __init__(self) -> None:
        self.enabled = settings.aimode_enabled
        self._pw = None
        self._browser = None
        self._ctx = None
        self._sem = asyncio.Semaphore(1)
        self._started = False

    @property
    def _selectors(self) -> list[str]:
        return settings.aimode_answer_selectors or _DEFAULT_ANSWER_SELECTORS

    async def startup(self) -> None:
        if not self.enabled or self._started:
            return
        from playwright.async_api import async_playwright

        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(
            headless=settings.aimode_headless,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        self._ctx = await self._browser.new_context(
            locale=settings.aimode_locale,
            user_agent=DESKTOP_UA,
            viewport={"width": 1280, "height": 900},
            extra_http_headers={
                "Accept-Language": f"{settings.aimode_locale},vi;q=0.9,en;q=0.8"
            },
        )
        self._started = True
        logger.info("aimode.started", headless=settings.aimode_headless)

    async def shutdown(self) -> None:
        try:
            if self._ctx:
                await self._ctx.close()
            if self._browser:
                await self._browser.close()
            if self._pw:
                await self._pw.stop()
        except Exception as e:  # noqa: BLE001 - shutdown best-effort
            logger.warning("aimode.shutdown_error", error=str(e))
        finally:
            self._ctx = self._browser = self._pw = None
            self._started = False

    async def chat(self, message: str, context, history) -> str:
        if not self._started:
            await self.startup()
        if not self._ctx:
            raise RuntimeError("aimode: browser context not available")

        steer = f"Trả lời ngắn gọn bằng tiếng Việt, thân thiện: {message}"
        hint = persona.short_context_hint(context)
        if hint:
            steer += f" ({hint})"
        url = settings.aimode_url_template.format(query=quote_plus(steer))

        async with self._sem:
            page = await self._ctx.new_page()
            try:
                await page.goto(
                    url,
                    timeout=settings.aimode_nav_timeout_ms,
                    wait_until="domcontentloaded",
                )
                await self._dismiss_consent(page)
                text = await self._extract_answer(page)
                if not text or len(text.strip()) < 15:
                    raise ValueError("aimode: answer too short/empty")
                return text.strip()
            finally:
                await page.close()

    async def _dismiss_consent(self, page) -> None:
        for sel in _CONSENT_SELECTORS:
            try:
                btn = page.locator(sel).first
                if await btn.count() > 0 and await btn.is_visible():
                    await btn.click(timeout=1500)
                    await page.wait_for_load_state("domcontentloaded", timeout=3000)
                    return
            except Exception:  # noqa: BLE001 - consent is best-effort
                continue

    async def _extract_answer(self, page) -> str:
        """Poll the candidate containers until the text stabilizes or we time out."""
        loop = asyncio.get_event_loop()
        deadline = loop.time() + settings.aimode_timeout_ms / 1000
        last = ""
        stable = 0
        while loop.time() < deadline:
            text = await self._read_best(page)
            if text and text == last and len(text) > 40:
                stable += 1
                if stable >= 2:
                    return text
            else:
                stable = 0
            last = text
            await asyncio.sleep(0.4)
        return last

    async def _read_best(self, page) -> str:
        # Return the FIRST selector that yields a real answer (selectors are in
        # priority order, most precise first) — not the longest, so we don't grab
        # a broader container that includes page chrome / the disclaimer footer.
        for sel in self._selectors:
            try:
                loc = page.locator(sel).first
                if await loc.count() == 0:
                    continue
                t = _clean(await loc.inner_text(timeout=1000))
                if len(t) >= 40 and not _looks_like_results(t):
                    return t
            except Exception:  # noqa: BLE001 - selector miss is fine
                continue
        return ""
