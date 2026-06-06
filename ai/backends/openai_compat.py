"""
BACKUP 2 — OpenAI-compatible chat completions (gemma-4).

Async port of the call proven working in d:\Luni\check_api.py. Base URL, token
and model come from env (never hardcoded).
"""

import httpx
import structlog

import persona
from config import settings

logger = structlog.get_logger()


class OpenAICompatBackend:
    name = "openai_compat"

    def __init__(self) -> None:
        self.enabled = (
            settings.openai_compat_enabled
            and bool(settings.openai_compat_base_url)
            and bool(settings.openai_compat_token)
        )
        self._client = httpx.AsyncClient()

    async def chat(self, message: str, context, history) -> str:
        messages = persona.build_openai_messages(
            message, context, history, settings.luni_max_history
        )
        url = settings.openai_compat_base_url.rstrip("/") + settings.openai_compat_path
        resp = await self._client.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.openai_compat_token}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.openai_compat_model,
                "messages": messages,
                "max_tokens": settings.openai_compat_max_tokens,
                "temperature": settings.openai_compat_temperature,
            },
            timeout=settings.openai_compat_timeout_ms / 1000,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
