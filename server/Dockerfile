FROM python:3.12-slim

WORKDIR /app

# System deps for asyncpg, opus codec, audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev libopus-dev ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY alembic.ini .

# Create storage directory
RUN mkdir -p /app/storage/firmware

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
