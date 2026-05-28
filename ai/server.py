"""
Luni AI — Generic AI gateway container.

Internal API only (accessible via Docker network, not exposed to internet).
Endpoints follow the contract defined in PLAN_PHASE2.md §4.2.

Current implementation: STUB — returns placeholder responses.
Replace with real AI backends (Gemini, Ollama, faster-whisper, Piper, etc.)
as needed. The API contract stays the same regardless of implementation.
"""

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse

app = FastAPI(title="Luni AI")


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
    message = body.get("message", "")

    # STUB: echo back — replace with real LLM
    return {
        "text": f"[stub] Tôi nhận được: {message}",
        "emotion": "neutral",
    }


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
