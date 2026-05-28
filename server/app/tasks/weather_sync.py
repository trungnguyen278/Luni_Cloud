"""
Luni Server — Periodic weather sync task.
"""

import structlog

from app.tasks.scheduler import scheduler

logger = structlog.get_logger()


@scheduler.scheduled_job("interval", minutes=15, id="weather_sync")
async def weather_sync():
    """Fetch weather for all online devices, cache in Redis, push via WS."""
    from app.db.database import async_session
    from app.services.sync_data import SyncDataService
    from app.services.ws_manager import manager

    online_devices = list(manager.device_connections.keys())
    if not online_devices:
        return

    redis = manager.redis
    if not redis:
        return

    async with async_session() as db:
        sync_service = SyncDataService(redis, db)
        for device_id in online_devices:
            try:
                await sync_service.push_to_device(device_id)
            except Exception as e:
                logger.error(
                    "task.weather_sync_failed",
                    device_id=device_id,
                    error=str(e),
                )
