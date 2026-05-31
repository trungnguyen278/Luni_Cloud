"""
Luni Server — Firmware binary storage.

Stores OTA images either in Cloudflare R2 (S3-compatible, when CF_R2_* is
configured) or on a local volume (docker-compose mounts firmware_storage at
/app/storage/firmware). Downloads are streamed back through the API so the
robot can fetch over the same trusted domain (lunirobot.io.vn) it already uses.
"""

import asyncio
from pathlib import Path

import structlog

from app.config import Settings

logger = structlog.get_logger()

_LOCAL_ROOT = Path("/app/storage/firmware")


class FirmwareStorage:
    """Upload / fetch / delete firmware binaries (R2 or local disk)."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.use_r2 = bool(settings.cf_r2_access_key and settings.cf_r2_secret_key)
        self.bucket = settings.cf_r2_bucket

    def _client(self):
        import boto3

        return boto3.client(
            "s3",
            endpoint_url=self.settings.r2_endpoint_url,
            aws_access_key_id=self.settings.cf_r2_access_key,
            aws_secret_access_key=self.settings.cf_r2_secret_key,
            region_name="auto",
        )

    async def save(self, key: str, data: bytes) -> None:
        """Persist firmware bytes under `key`."""
        if self.use_r2:
            def _put():
                self._client().put_object(
                    Bucket=self.bucket,
                    Key=key,
                    Body=data,
                    ContentType="application/octet-stream",
                )
            await asyncio.to_thread(_put)
            logger.info("firmware.stored", backend="r2", key=key, size=len(data))
        else:
            def _write():
                path = _LOCAL_ROOT / key
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
            await asyncio.to_thread(_write)
            logger.info("firmware.stored", backend="local", key=key, size=len(data))

    async def read(self, key: str) -> bytes | None:
        """Fetch firmware bytes for `key`, or None if missing."""
        if self.use_r2:
            def _get():
                try:
                    obj = self._client().get_object(Bucket=self.bucket, Key=key)
                    return obj["Body"].read()
                except Exception:
                    return None
            return await asyncio.to_thread(_get)
        else:
            def _read():
                path = _LOCAL_ROOT / key
                return path.read_bytes() if path.exists() else None
            return await asyncio.to_thread(_read)

    async def delete(self, key: str) -> None:
        """Best-effort removal of a stored firmware binary."""
        if self.use_r2:
            def _del():
                try:
                    self._client().delete_object(Bucket=self.bucket, Key=key)
                except Exception as e:
                    logger.warning("firmware.delete_failed", key=key, error=str(e))
            await asyncio.to_thread(_del)
        else:
            def _unlink():
                path = _LOCAL_ROOT / key
                if path.exists():
                    path.unlink()
            await asyncio.to_thread(_unlink)
