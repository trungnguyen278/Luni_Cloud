"""
Luni Server — AI client (calls luni-ai container via HTTP).

Server does NOT know what runs inside the AI container.
It only calls the defined API contract: /health, /chat, /stt, /tts.
"""

import time
from uuid import uuid4

import httpx
import structlog

from app.config import Settings

logger = structlog.get_logger()


class AIService:
    """AI gateway client — calls luni-ai container via internal Docker network."""

    def __init__(self, settings: Settings):
        self.ai_url = settings.ai_service_url
        self.http = httpx.AsyncClient(timeout=30.0)

    async def health(self) -> dict:
        resp = await self.http.get(f"{self.ai_url}/health")
        resp.raise_for_status()
        return resp.json()

    async def chat(
        self,
        message: str,
        context: dict | None = None,
        history: list[dict] | None = None,
    ) -> dict:
        """
        Send text to AI container, get response + emotion.
        Returns: {"text": "...", "emotion": "..."}
        """
        payload: dict = {"message": message}
        if context:
            payload["context"] = context
        if history:
            payload["history"] = history

        resp = await self.http.post(f"{self.ai_url}/chat", json=payload)
        resp.raise_for_status()
        return resp.json()

    async def transcribe(self, audio_data: bytes, language: str = "vi") -> str:
        """Send audio to AI container, get transcribed text."""
        resp = await self.http.post(
            f"{self.ai_url}/stt",
            files={"file": ("audio.wav", audio_data, "audio/wav")},
            data={"language": language},
        )
        resp.raise_for_status()
        return resp.json()["text"]

    async def synthesize(self, text: str) -> bytes:
        """Send text to AI container, get audio bytes."""
        resp = await self.http.post(
            f"{self.ai_url}/tts",
            data={"text": text},
        )
        resp.raise_for_status()
        return resp.content

    async def process_text_interaction(
        self,
        text: str,
        device_id: str,
        user_id: str | None,
        device_context: dict | None = None,
        conversation_history: list[dict] | None = None,
    ) -> dict:
        """Full pipeline: text -> chat -> TTS -> push to device via WS."""
        from app.services.ws_manager import manager

        chat_history = None
        if conversation_history:
            chat_history = []
            for h in conversation_history[-10:]:
                role = "user" if h.get("direction") == "user_to_device" else "assistant"
                content = h.get("input_text") or h.get("output_text", "")
                chat_history.append({"role": role, "content": content})

        chat_result = await self.chat(
            message=text,
            context=device_context,
            history=chat_history,
        )

        audio = None
        try:
            audio = await self.synthesize(chat_result["text"])
        except Exception as e:
            logger.warning("ai.tts_failed", error=str(e))

        await manager.send_to_device(device_id, {
            "type": "set_emotion",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {"emotion": chat_result.get("emotion", "neutral")},
        })

        await manager.send_to_device(device_id, {
            "type": "tts_play",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {"text": chat_result["text"]},
        })

        audio_sent = False
        if audio:
            audio_sent = await manager.send_binary_to_device(device_id, audio)

        await manager.notify_app_clients(device_id, {
            "type": "interaction_result",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {
                "input": text,
                "output": chat_result["text"],
                "emotion": chat_result.get("emotion", "neutral"),
            },
        })

        return {
            "text": chat_result["text"],
            "emotion": chat_result.get("emotion", "neutral"),
            "audio_sent": audio_sent,
        }
