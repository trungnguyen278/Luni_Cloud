# Playwright base image: ships Chromium + all system libs verified for this
# Playwright version. Keep the tag in sync with `playwright==1.48.0` in
# requirements.txt. Larger image (~1.6-2GB) but robust for the AI Mode backend.
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app

# curl for the compose healthcheck; ffmpeg/libsndfile kept for future STT/TTS.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Chromium is already in the base image. If you bump the playwright pin, also run:
#   RUN playwright install chromium

COPY server.py config.py orchestrator.py emotion.py emotion_select.py persona.py ./
COPY backends ./backends

RUN mkdir -p /app/models

EXPOSE 8081

# Single worker on purpose: one shared headless browser context + asyncio lock.
# Do NOT add --workers N (each worker would spawn its own Chromium).
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8081"]
