"""
Luni Server — sync_data aggregation and push service.

Builds time + weather + calendar + location payload per device,
caches in Redis, pushes to device via WebSocket.
"""

import json
import time
from uuid import uuid4

import structlog
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import Device
from app.services.calendar_service import CalendarService
from app.services.weather import WeatherService

logger = structlog.get_logger()


class SyncDataService:
    """Aggregate and push sync_data payload to devices."""

    def __init__(self, redis: Redis, db: AsyncSession):
        self.redis = redis
        self.db = db
        settings = get_settings()
        self.weather = WeatherService(redis, settings)
        self.calendar = CalendarService(redis)
        self.cache_ttl = settings.sync_cache_ttl_seconds

    async def build_sync_payload(self, device: Device) -> dict:
        cache_key = f"sync:{device.id}"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        import zoneinfo
        from datetime import datetime

        tz = zoneinfo.ZoneInfo(device.timezone or "Asia/Ho_Chi_Minh")
        now = datetime.now(tz)

        weather = None
        if device.latitude and device.longitude:
            try:
                weather = await self.weather.get_weather(
                    device.latitude, device.longitude
                )
            except Exception as e:
                logger.warning("sync.weather_failed", device_id=device.id, error=str(e))

        calendar = None
        try:
            calendar = await self.calendar.get_calendar(
                now.strftime("%Y-%m-%d"),
                device.timezone or "Asia/Ho_Chi_Minh",
            )
        except Exception as e:
            logger.warning("sync.calendar_failed", device_id=device.id, error=str(e))

        payload = {
            "time": {
                "unix": int(time.time()),
                "tz": device.timezone or "Asia/Ho_Chi_Minh",
                "utc_offset": now.utcoffset().total_seconds() / 3600,
            },
            "weather": weather,
            "calendar": calendar,
            "location": {
                "city": device.city,
                "lat": device.latitude,
                "lon": device.longitude,
            } if device.latitude else None,
        }

        await self.redis.setex(cache_key, self.cache_ttl, json.dumps(payload))
        return payload

    async def push_to_device(self, device_id: str) -> bool:
        from app.services.ws_manager import manager

        result = await self.db.execute(
            select(Device).where(Device.id == device_id)
        )
        device = result.scalar_one_or_none()
        if not device:
            return False

        payload = await self.build_sync_payload(device)

        message = {
            "type": "sync_data",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": payload,
        }

        return await manager.send_to_device(device_id, message)

    async def push_to_all_online(self):
        from app.services.ws_manager import manager

        for device_id in list(manager.device_connections.keys()):
            try:
                await self.push_to_device(device_id)
            except Exception as e:
                logger.error("sync.push_failed", device_id=device_id, error=str(e))
