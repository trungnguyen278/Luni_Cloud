"""
Luni Server — Daily calendar cache refresh.
"""

import structlog

from app.tasks.scheduler import scheduler

logger = structlog.get_logger()


@scheduler.scheduled_job("cron", hour=0, minute=5, id="calendar_sync")
async def calendar_sync():
    """Invalidate calendar and sync caches daily at 00:05."""
    from app.services.ws_manager import manager

    redis = manager.redis
    if not redis:
        return

    keys = []
    async for key in redis.scan_iter(match="calendar:*"):
        keys.append(key)
    if keys:
        await redis.delete(*keys)

    sync_keys = []
    async for key in redis.scan_iter(match="sync:*"):
        sync_keys.append(key)
    if sync_keys:
        await redis.delete(*sync_keys)

    logger.info(
        "task.calendar_sync",
        invalidated_keys=len(keys) + len(sync_keys),
    )
