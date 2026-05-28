"""
Luni Server — Data API endpoints (weather, calendar, sync_data).
"""

from datetime import date as date_type

import structlog
from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_redis
from app.config import get_settings
from app.core.exceptions import DeviceOfflineError, ForbiddenError, NotFoundError
from app.db.models import Device, DeviceShare, User
from app.services.calendar_service import CalendarService
from app.services.sync_data import SyncDataService
from app.services.weather import WeatherService

logger = structlog.get_logger()

router = APIRouter()


async def _get_device_with_access(
    device_id: str, user: User, db: AsyncSession
) -> Device:
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise NotFoundError("Device", device_id)

    if user.role == "admin" or device.owner_id == user.id:
        return device

    share = await db.execute(
        select(DeviceShare).where(
            DeviceShare.device_id == device_id,
            DeviceShare.user_id == user.id,
        )
    )
    if not share.scalar_one_or_none():
        raise ForbiddenError("No access to this device")
    return device


@router.get("/weather")
async def get_weather(
    lat: float = Query(...),
    lon: float = Query(...),
    user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """Get weather data for coordinates (cached)."""
    service = WeatherService(redis, get_settings())
    result = await service.get_weather(lat, lon)
    if result is None:
        return {"error": "Weather service unavailable (no API key configured)"}
    return result


@router.get("/calendar")
async def get_calendar(
    date: str | None = Query(None),
    user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """Get calendar + lunar date info."""
    if not date:
        date = date_type.today().isoformat()
    service = CalendarService(redis)
    return await service.get_calendar(date)


@router.get("/sync/{device_id}")
async def get_sync_data(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Get the sync_data payload for a device."""
    device = await _get_device_with_access(device_id, user, db)
    service = SyncDataService(redis, db)
    return await service.build_sync_payload(device)


@router.post("/sync/{device_id}/push")
async def force_push_sync(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Force push sync_data to device now."""
    await _get_device_with_access(device_id, user, db)
    service = SyncDataService(redis, db)
    sent = await service.push_to_device(device_id)
    if not sent:
        raise DeviceOfflineError(device_id)
    return {"status": "ok"}
