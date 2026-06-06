"""
Luni AI — chat orchestrator.

Tries the configured backends in order, each with its own timeout. Returns the
first successful reply (with emotion inferred uniformly). If every backend fails,
returns a friendly Vietnamese fallback with HTTP 200 so the robot always says
something — it never surfaces a 5xx to the device.
"""

import asyncio

import structlog

import backends
import emotion_select
from config import settings

logger = structlog.get_logger()


async def chat(message: str, context, history) -> dict:
    for name in settings.chat_backends:
        backend = backends.registry.get(name)
        if backend is None:
            logger.warning("ai.backend.unknown", backend=name)
            continue
        if not backend.enabled:
            logger.info("ai.backend.skipped", backend=name)
            continue

        timeout = settings.timeout_ms(name) / 1000
        try:
            text = await asyncio.wait_for(
                backend.chat(message, context, history), timeout
            )
            text = (text or "").strip()
            if not text:
                raise ValueError("empty response")
            emotion = await emotion_select.select_emotion(text)
            logger.info("ai.backend.used", backend=name, chars=len(text), emotion=emotion)
            return {"text": text, "emotion": emotion}
        except asyncio.TimeoutError:
            logger.warning("ai.backend.failed", backend=name, error="timeout")
        except Exception as e:  # noqa: BLE001 - fall through to next backend
            logger.warning("ai.backend.failed", backend=name, error=str(e))

    logger.error("ai.all_backends_failed")
    return {"text": settings.fallback_message, "emotion": "normal"}
