"""
Luni Server — Log retention cleanup task.
"""

import structlog

from app.tasks.scheduler import scheduler

logger = structlog.get_logger()


@scheduler.scheduled_job("cron", day_of_week="sun", hour=3, id="log_cleanup")
async def log_cleanup():
    """Clean up old logs — weekly Sunday 03:00."""
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import delete

    from app.db.database import async_session
    from app.db.models import DeviceLog, ServerLog

    cutoff_device = datetime.now(timezone.utc) - timedelta(days=90)
    cutoff_server = datetime.now(timezone.utc) - timedelta(days=30)

    try:
        async with async_session() as db:
            r1 = await db.execute(
                delete(DeviceLog).where(DeviceLog.created_at < cutoff_device)
            )
            r2 = await db.execute(
                delete(ServerLog).where(ServerLog.created_at < cutoff_server)
            )
            await db.commit()

            logger.info(
                "task.log_cleanup",
                device_logs_deleted=r1.rowcount,
                server_logs_deleted=r2.rowcount,
            )
    except Exception as e:
        logger.error("task.log_cleanup_failed", error=str(e))
