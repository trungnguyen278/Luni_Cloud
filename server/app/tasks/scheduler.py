"""
Luni Server — Background task scheduler (APScheduler).
"""

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = structlog.get_logger()

scheduler = AsyncIOScheduler()


def start_scheduler():
    """Start the background task scheduler."""
    if not scheduler.running:
        # Import task modules — their decorators auto-register with scheduler
        import app.tasks.weather_sync  # noqa: F401
        import app.tasks.calendar_sync  # noqa: F401
        import app.tasks.log_cleanup  # noqa: F401

        scheduler.start()
        logger.info("scheduler.started")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("scheduler.stopped")


# === Heartbeat check — every 60s ===

@scheduler.scheduled_job("interval", seconds=60, id="heartbeat_check")
async def heartbeat_check():
    """Mark devices as offline if no heartbeat for 90s."""
    from app.services.ws_manager import manager
    await manager.check_heartbeats(timeout_seconds=90.0)


# === Token cleanup — daily at 02:00 ===

@scheduler.scheduled_job("cron", hour=2, minute=0, id="token_cleanup")
async def token_cleanup():
    """Remove expired refresh tokens from DB."""
    from datetime import datetime, timezone

    from sqlalchemy import delete

    from app.db.database import async_session
    from app.db.models import RefreshToken

    try:
        async with async_session() as db:
            result = await db.execute(
                delete(RefreshToken).where(
                    RefreshToken.expires_at < datetime.now(timezone.utc)
                )
            )
            await db.commit()
            count = result.rowcount
            if count > 0:
                logger.info("scheduler.token_cleanup", removed=count)
    except Exception as e:
        logger.error("scheduler.token_cleanup_failed", error=str(e))
