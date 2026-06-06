"""
Luni Server — Device usage statistics endpoint.

GET /devices/{device_id}/stats?days=7

Returns the shape the app's StatsScreen expects:
- daily_interactions: list[int]  (one bar per day, oldest -> newest)
- uptime_today:       str        (formatted, e.g. "5h 12m")
- audio_minutes:      str        (formatted, e.g. "3 phút")
- warnings:           int        (warning/error logs today)
"""

from datetime import datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.api.v1.devices import _get_device_with_access
from app.db.models import DeviceLog, Interaction, UsageStat, User

logger = structlog.get_logger()

router = APIRouter()


def _fmt_uptime(seconds: int) -> str:
    if not seconds or seconds <= 0:
        return "—"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


@router.get("/devices/{device_id}/stats")
async def device_stats(
    device_id: str,
    days: int = Query(default=7, ge=1, le=30),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate per-device usage for the dashboard."""
    device = await _get_device_with_access(device_id, user, db)

    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    window_start = today_start - timedelta(days=days - 1)

    # Per-day interaction counts over the window.
    rows = await db.execute(
        select(
            func.date(Interaction.created_at).label("day"),
            func.count().label("n"),
        )
        .where(
            Interaction.device_id == device.id,
            Interaction.created_at >= window_start,
        )
        .group_by(func.date(Interaction.created_at))
    )
    counts: dict[str, int] = {}
    for day, n in rows.all():
        key = day.isoformat() if hasattr(day, "isoformat") else str(day)
        counts[key] = int(n)

    daily_interactions = [
        counts.get((window_start + timedelta(days=i)).date().isoformat(), 0)
        for i in range(days)
    ]

    # Audio seconds today.
    audio_secs = float(
        (
            await db.execute(
                select(func.coalesce(func.sum(Interaction.audio_secs), 0)).where(
                    Interaction.device_id == device.id,
                    Interaction.created_at >= today_start,
                )
            )
        ).scalar()
        or 0
    )

    # Warning/error logs today.
    warnings = int(
        (
            await db.execute(
                select(func.count()).where(
                    DeviceLog.device_id == device.id,
                    DeviceLog.level.in_(["warning", "error", "critical"]),
                    DeviceLog.created_at >= today_start,
                )
            )
        ).scalar()
        or 0
    )

    # Uptime today from the aggregated usage_stats row (if populated).
    usage = (
        await db.execute(
            select(UsageStat).where(
                UsageStat.device_id == device.id,
                UsageStat.date == today_start.date(),
            )
        )
    ).scalar_one_or_none()
    uptime_secs = int(usage.uptime_secs) if usage and usage.uptime_secs else 0

    # Battery history — min_battery per day from usage_stats over the window.
    batt_rows = await db.execute(
        select(UsageStat.date, UsageStat.min_battery).where(
            UsageStat.device_id == device.id,
            UsageStat.date >= window_start.date(),
        )
    )
    batt_map: dict[str, int | None] = {}
    for dt, mb in batt_rows.all():
        key = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
        batt_map[key] = int(mb) if mb is not None else None
    battery = [batt_map.get((window_start + timedelta(days=i)).date().isoformat()) for i in range(days)]

    # Emotion distribution over the window.
    emo_rows = await db.execute(
        select(Interaction.emotion, func.count())
        .where(
            Interaction.device_id == device.id,
            Interaction.created_at >= window_start,
            Interaction.emotion.isnot(None),
        )
        .group_by(Interaction.emotion)
        .order_by(func.count().desc())
    )
    emotions = [{"emotion": e, "count": int(n)} for e, n in emo_rows.all()]

    return {
        "daily_interactions": daily_interactions,
        "uptime_today": _fmt_uptime(uptime_secs),
        "audio_minutes": f"{audio_secs / 60:.0f} phút",
        "warnings": warnings,
        "battery": battery,
        "emotions": emotions,
    }
