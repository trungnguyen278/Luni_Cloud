"""
Luni AI — LLM-based emotion selection.

The reply text (from ANY backend, including AI Mode) is handed to a small LLM
classification call that picks ONE of the 45 emotion keys. This realizes the
design "the LLM chooses the expression". Order is configurable via EMOTION_PICKER:
  - "auto" (default): try the user's own gemma server first, then Gemini.
  - "openai_compat" | "gemini": force one picker.
  - "heuristic": skip the LLM entirely and use the keyword fallback.
On any failure the Vietnamese keyword heuristic (emotion.infer_emotion) is used.
"""

import re

import httpx
import structlog

from config import settings
from emotion import (
    DEFAULT_EMOTION,
    EMOTION_LIST,
    VALID_EMOTIONS,
    clamp_emotion,
    infer_emotion,
)

logger = structlog.get_logger()

_client = httpx.AsyncClient()

_SYSTEM = (
    "Bạn là bộ chọn biểu cảm khuôn mặt cho robot Luni. Cho trước câu trả lời của "
    "Luni, hãy chọn DUY NHẤT một biểu cảm phù hợp nhất với cảm xúc và ngữ cảnh của "
    "câu đó. CHỈ trả về đúng một từ khoá trong danh sách dưới đây, viết thường, "
    "không thêm dấu câu hay giải thích.\nDanh sách: " + ", ".join(EMOTION_LIST)
)


def _extract(raw: str) -> str | None:
    """Pull the first valid emotion key out of the model's short reply."""
    s = (raw or "").strip().lower()
    if s in VALID_EMOTIONS:
        return s
    for k in EMOTION_LIST:
        if re.search(r"(?<![a-z])" + re.escape(k) + r"(?![a-z])", s):
            return k
    return None


async def _pick_openai(text: str) -> str | None:
    url = settings.openai_compat_base_url.rstrip("/") + settings.openai_compat_path
    resp = await _client.post(
        url,
        headers={
            "Authorization": f"Bearer {settings.openai_compat_token}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.openai_compat_model,
            "messages": [
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": text},
            ],
            "max_tokens": 8,
            "temperature": 0.0,
        },
        timeout=settings.emotion_timeout_ms / 1000,
    )
    resp.raise_for_status()
    return _extract(resp.json()["choices"][0]["message"]["content"])


async def _pick_gemini(text: str) -> str | None:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    body = {
        "system_instruction": {"parts": [{"text": _SYSTEM}]},
        "contents": [{"role": "user", "parts": [{"text": text}]}],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 20},
    }
    resp = await _client.post(
        url,
        params={"key": settings.gemini_api_key},
        json=body,
        timeout=settings.emotion_timeout_ms / 1000,
    )
    resp.raise_for_status()
    cands = resp.json().get("candidates") or []
    if not cands:
        return None
    parts = cands[0].get("content", {}).get("parts", [])
    return _extract("".join(p.get("text", "") for p in parts))


def _order() -> list[str]:
    picker = (settings.emotion_picker or "auto").lower()
    if picker == "heuristic":
        return []
    if picker in ("openai_compat", "gemini"):
        return [picker]
    # auto: prefer the user's own gemma server, then Gemini.
    out: list[str] = []
    if (
        settings.openai_compat_enabled
        and settings.openai_compat_base_url
        and settings.openai_compat_token
    ):
        out.append("openai_compat")
    if settings.gemini_enabled and settings.gemini_api_key:
        out.append("gemini")
    return out


async def select_emotion(text: str) -> str:
    """Return one of the 45 emotion keys for `text` (never raises)."""
    if not text or not text.strip():
        return DEFAULT_EMOTION

    for name in _order():
        try:
            key = await (_pick_openai(text) if name == "openai_compat" else _pick_gemini(text))
            if key:
                logger.info("ai.emotion.picked", picker=name, emotion=key)
                return clamp_emotion(key)
            logger.warning("ai.emotion.unparsed", picker=name)
        except Exception as e:  # noqa: BLE001 - fall through to next / heuristic
            logger.warning("ai.emotion.failed", picker=name, error=str(e))

    emo = infer_emotion(text)
    logger.info("ai.emotion.heuristic", emotion=emo)
    return emo
