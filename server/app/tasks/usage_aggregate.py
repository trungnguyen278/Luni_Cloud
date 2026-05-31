"""
Luni Server — Daily usage_stats aggregation.

Rolls up today's interactions / audio / warnings / errors per device into the
`usage_stats` table so the dashboard has historical data. Runs near end of day;
the live /stats endpoint still computes today's chart directly from interactions.
"""

from datetime import datetime, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.database import async_session
from app.db.models import Device, DeviceLog, Interaction, UsageStat
from app.tasks.scheduler import scheduler

logger = structlog.get_logger()


@scheduler.scheduled_job("cron", hour=23, minute=50, id="usage_aggregate")
async def aggregate_usage():
    """Upsert today's per-device usage_stats."""
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    today = today_start.date()

    try:
        async with async_session() as db:
            device_ids = list(
                (await db.execute(select(Device.id))).scalars().all()
            )

            for device_id in device_ids:
                interactions = int(
                    (
                        await db.execute(
                            select(func.count()).where(
                                Interaction.device_id == device_id,
                                Interaction.created_at >= today_start,
                            )
                        )
                    ).scalar()
                    or 0
                )
                audio_secs = int(
                    float(
                        (
                            await db.execute(
                                select(
                                    func.coalesce(func.sum(Interaction.audio_secs), 0)
                                ).where(
                                    Interaction.device_id == device_id,
                                    Interaction.created_at >= today_start,
                                )
                            )
                        ).scalar()
                        or 0
                    )
                )
                warnings = int(
                    (
                        await db.execute(
                            select(func.count()).where(
                                DeviceLog.device_id == device_id,
                                DeviceLog.level == "warning",
                                DeviceLog.created_at >= today_start,
                            )
                        )
                    ).scalar()
                    or 0
                )
                errors = int(
                    (
                        await db.execute(
                            select(func.count()).where(
                                DeviceLog.device_id == device_id,
                                DeviceLog.level.in_(["error", "critical"]),
                                DeviceLog.created_at >= today_start,
                            )
                        )
                    ).scalar()
                    or 0
                )

                if not (interactions or audio_secs or warnings or errors):
                    continue

                stmt = pg_insert(UsageStat).values(
                    device_id=device_id,
                    date=today,
                    interactions=interactions,
                    audio_secs=audio_secs,
                    warnings=warnings,
                    errors=errors,
                )
                stmt = stmt.on_conflict_do_update(
                    index_elements=["device_id", "date"],
                    set_={
                        "interactions": interactions,
                        "audio_secs": audio_secs,
                        "warnings": warnings,
                        "errors": errors,
                    },
                )
                await db.execute(stmt)

            await db.commit()
            logger.info("scheduler.usage_aggregate", devices=len(device_ids))
    except Exception as e:
        logger.error("scheduler.usage_aggregate_failed", error=str(e))
