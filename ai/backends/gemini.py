"""
BACKUP 1 — Gemini (Google AI Studio) via the Generative Language REST API.

Uses httpx directly (no heavy SDK) to keep the image small. Optionally enables
the Google Search grounding tool when GEMINI_GROUNDING=true.
"""

import httpx
import structlog

import persona
from config import settings

logger = structlog.get_logger()


class GeminiBackend:
    name = "gemini"

    def __init__(self) -> None:
        self.enabled = settings.gemini_enabled and bool(settings.gemini_api_key)
        self._client = httpx.AsyncClient()

    async def chat(self, message: str, context, history) -> str:
        contents = persona.to_gemini_contents(
            history, context, message, settings.luni_max_history
        )
        body: dict = {
            "system_instruction": {"parts": [{"text": persona.LUNI_SYSTEM_VI}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 512},
        }
        if settings.gemini_grounding:
            body["tools"] = [{"google_search": {}}]

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemini_model}:generateContent"
        )
        resp = await self._client.post(
            url,
            params={"key": settings.gemini_api_key},
            json=body,
            timeout=settings.gemini_timeout_ms / 1000,
        )
        resp.raise_for_status()
        data = resp.json()

        candidates = data.get("candidates") or []
        if not candidates:
            # Blocked / empty -> let the orchestrator fall through.
            reason = data.get("promptFeedback", {}).get("blockReason", "no_candidates")
            raise RuntimeError(f"gemini: {reason}")

        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts)
        if not text.strip():
            raise RuntimeError("gemini: empty text")
        return text
