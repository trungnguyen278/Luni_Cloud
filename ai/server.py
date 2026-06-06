"""
Luni AI — Generic AI gateway container.

Internal API only (accessible via Docker network, not exposed to internet).
Endpoints follow the contract defined in PLAN_PHASE2.md §4.2.

/chat is backed by a 3-tier fallback chain (Google AI Mode -> Gemini -> gemma-4);
see orchestrator.py and backends/. /stt and /tts remain stubs (501) for now —
the API contract stays the same regardless of implementation.
"""

import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse

import backends
import orchestrator
from config import settings

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Launch the shared headless browser once (AI Mode primary backend).
    if backends.aimode.enabled:
        try:
            await backends.aimode.startup()
        except Exception as e:  # noqa: BLE001 - AI Mode is optional; backups remain
            logger.warning("aimode.startup_failed", error=str(e))
    yield
    if backends.aimode.enabled:
        await backends.aimode.shutdown()


app = FastAPI(title="Luni AI", lifespan=lifespan)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "capabilities": {
            "chat": True,
            "stt": False,
            "tts": False,
            "vision": False,
        },
        "chat_order": settings.chat_backends,
        "backends": {name: b.enabled for name, b in backends.registry.items()},
    }


@app.post("/chat")
async def chat(body: dict):
    """
    Chat endpoint — text in, text + emotion out.

    Expected request:
      {"message": "...", "context": {...}, "history": [...]}

    Expected response:
      {"text": "...", "emotion": "neutral"}
    """
    return await orchestrator.chat(
        body.get("message", ""),
        body.get("context"),
        body.get("history"),
    )


@app.post("/stt")
async def speech_to_text(
    file: UploadFile = File(...),
    language: str = Form("vi"),
):
    """
    STT endpoint — audio file in, text out.

    Expected response:
      {"text": "transcribed text", "language": "vi"}
    """
    await file.read()

    # STUB: not implemented yet
    return JSONResponse(
        status_code=501,
        content={"error": "STT not implemented yet"},
    )


@app.post("/tts")
async def text_to_speech(
    text: str = Form(...),
):
    """
    TTS endpoint — text in, audio bytes out.

    Expected response:
      Content-Type: audio/wav (or audio/mp3)
      Body: <audio binary>
    """
    # STUB: not implemented yet
    return JSONResponse(
        status_code=501,
        content={"error": "TTS not implemented yet"},
    )
