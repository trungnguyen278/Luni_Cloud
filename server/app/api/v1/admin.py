"""
Luni Server — Admin fleet + analytics endpoints.

These power the web Cloud Console's admin views. No schema changes:
everything is derived from existing tables + the live WS manager.

GET  /admin/devices            — whole fleet with live status
GET  /admin/overview           — aggregated KPIs
GET  /admin/stats/emotions     — emotion distribution across the fleet
GET  /admin/ai/usage           — AI usage + estimated cost (VND)
POST /admin/ota/rollout        — staged OTA push to a channel/model
"""

import time
import uuid
from datetime import datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_ws_manager, require_admin
from app.config import get_settings
from app.core.exceptions import NotFoundError
from app.db.models import Device, Firmware, Interaction, OTAHistory, ServerLog, User
from app.services.ws_manager import ConnectionManager

logger = structlog.get_logger()

router = APIRouter()

# AI cost model: real conversation counts × a transparent unit estimate.
_AVG_TOKENS_PER_CONV = 1365
_SERVICE_SPLIT = [
    ("llm", "Trò chuyện (LLM)", "chat", "#5BE9FF", 0.58),
    ("stt", "Nhận giọng nói (STT)", "mic", "#76B8FF", 0.22),
    ("tts", "Giọng nói Luni (TTS)", "volume", "#FFD166", 0.14),
    ("mem", "Trí nhớ (Embeddings)", "sparkle", "#B48CFF", 0.06),
]

_OTA_ACTIVE = ("pending", "downloading", "verifying", "flashing")


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _rel_time(dt: datetime | None) -> str:
    dt = _aware(dt)
    if not dt:
        return "—"
    sec = (datetime.now(timezone.utc) - dt).total_seconds()
    if sec < 60:
        return "vừa xong"
    if sec < 3600:
        return f"{int(sec // 60)} phút trước"
    if sec < 86400:
        return f"{int(sec // 3600)} giờ trước"
    return f"{int(sec // 86400)} ngày trước"


def _ser_device(d: Device, owner: User | None, online: bool, updating: bool) -> dict:
    st = d.last_state or {}
    batt = st.get("battery")
    if isinstance(batt, dict):
        battery = int(batt.get("percent", 0) or 0)
        charging = bool(batt.get("charging"))
    else:
        battery = int(batt or st.get("battery_percent", 0) or 0)
        charging = bool(st.get("charging"))
    rssi = int(st.get("rssi", st.get("signal", 0)) or 0)
    emotion = str(st.get("emotion", "idle"))

    if not online:
        status = "offline"
    elif updating:
        status = "updating"
    elif battery and battery <= 15:
        status = "warn"
    else:
        status = "ok"

    return {
        "id": d.id,
        "name": d.name,
        "owner": owner.name if owner else "— chưa gán",
        "email": owner.email if owner else "—",
        "city": d.city or "",
        "model": d.model,
        "fw": d.fw_version or "—",
        "online": online,
        "battery": battery,
        "charging": charging,
        "rssi": rssi,
        "emotion": emotion,
        "status": status,
        "lastSeen": _rel_time(d.last_seen),
    }


@router.get("/admin/devices")
async def admin_devices(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    ws: ConnectionManager = Depends(get_ws_manager),
):
    """List the whole fleet with live status (admin only)."""
    rows = await db.execute(
        select(Device, User).join(User, Device.owner_id == User.id, isouter=True).order_by(Device.created_at.desc())
    )
    pending = set(
        (
            await db.execute(select(OTAHistory.device_id).where(OTAHistory.status.in_(_OTA_ACTIVE)))
        )
        .scalars()
        .all()
    )
    out = []
    for d, owner in rows.all():
        online = ws.is_device_online(d.id)
        out.append(_ser_device(d, owner, online, d.id in pending and online))
    return out


@router.get("/admin/overview")
async def admin_overview(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    ws: ConnectionManager = Depends(get_ws_manager),
):
    """Aggregated KPIs for the admin overview."""
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    day_ago = now - timedelta(hours=24)

    total = int((await db.execute(select(func.count(Device.id)))).scalar() or 0)
    all_ids = (await db.execute(select(Device.id))).scalars().all()
    online = sum(1 for i in all_ids if ws.is_device_online(i))
    users = int((await db.execute(select(func.count(User.id)).where(User.role == "user"))).scalar() or 0)
    interactions_today = int(
        (await db.execute(select(func.count(Interaction.id)).where(Interaction.created_at >= today_start))).scalar() or 0
    )
    errors_24h = int(
        (
            await db.execute(
                select(func.count(ServerLog.id)).where(
                    ServerLog.level.in_(["error", "critical"]),
                    ServerLog.created_at >= day_ago,
                )
            )
        ).scalar()
        or 0
    )
    return {
        "devices_total": total,
        "devices_online": online,
        "users": users,
        "interactions_today": interactions_today,
        "errors_24h": errors_24h,
    }


@router.get("/admin/stats/emotions")
async def admin_emotions(
    days: int = Query(default=7, ge=1, le=90),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Emotion distribution across the fleet over the window."""
    window_start = datetime.now(timezone.utc) - timedelta(days=days)
    rows = await db.execute(
        select(Interaction.emotion, func.count())
        .where(Interaction.created_at >= window_start, Interaction.emotion.isnot(None))
        .group_by(Interaction.emotion)
        .order_by(func.count().desc())
    )
    return [{"emotion": e, "count": int(n)} for e, n in rows.all()]


@router.get("/admin/ai/usage")
async def admin_ai_usage(
    days: int = Query(default=30, ge=1, le=90),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    AI usage + estimated spend (VND).

    Conversation counts (per day / per device / total) are real; the cost is a
    transparent estimate = conversations × unit price (settings.ai_cost_per_conv_vnd),
    since the pipeline does not yet emit token-level billing. `estimated: true`.
    """
    settings = get_settings()
    price = getattr(settings, "ai_cost_per_conv_vnd", 372)
    budget = getattr(settings, "ai_monthly_budget_vnd", 25_000_000)

    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    window_start = today_start - timedelta(days=days - 1)

    rows = await db.execute(
        select(func.date(Interaction.created_at), func.count())
        .where(Interaction.created_at >= window_start)
        .group_by(func.date(Interaction.created_at))
    )
    counts: dict[str, int] = {}
    for day, n in rows.all():
        key = day.isoformat() if hasattr(day, "isoformat") else str(day)
        counts[key] = int(n)
    daily_conv = [counts.get((window_start + timedelta(days=i)).date().isoformat(), 0) for i in range(days)]
    daily_vnd = [c * price for c in daily_conv]

    conversations = sum(daily_conv)
    total = conversations * price
    avg_per_day = total / days if days else 0
    projected = int(avg_per_day * 30)
    tokens_est = conversations * _AVG_TOKENS_PER_CONV

    services = [
        {"id": sid, "label": label, "icon": icon, "c": color, "cost": int(total * ratio), "share": round(ratio * 100)}
        for sid, label, icon, color, ratio in _SERVICE_SPLIT
    ]

    dev_rows = await db.execute(
        select(Device.id, Device.name, User.name, func.count(Interaction.id))
        .join(Interaction, Interaction.device_id == Device.id)
        .join(User, Device.owner_id == User.id, isouter=True)
        .where(Interaction.created_at >= window_start)
        .group_by(Device.id, Device.name, User.name)
        .order_by(func.count(Interaction.id).desc())
        .limit(5)
    )
    devices = [
        {"id": did, "name": dname, "owner": oname or "—", "conv": int(c), "cost": int(c) * price}
        for did, dname, oname, c in dev_rows.all()
    ]

    return {
        "currency": "VND",
        "estimated": True,
        "unit_price": price,
        "total": total,
        "budget": budget,
        "projected": projected,
        "tokens_est": tokens_est,
        "conversations": conversations,
        "per_conversation": price,
        "daily": daily_vnd,
        "daily_conv": daily_conv,
        "services": services,
        "devices": devices,
    }


class RolloutRequest(BaseModel):
    firmware_id: str = Field(..., description="Firmware UUID to roll out")
    percent: int = Field(default=100, ge=1, le=100, description="Staged rollout percentage")


@router.post("/admin/ota/rollout")
async def admin_ota_rollout(
    body: RolloutRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    ws: ConnectionManager = Depends(get_ws_manager),
):
    """Push an `ota_available` to eligible devices of the firmware's model (staged)."""
    try:
        fw_id = uuid.UUID(body.firmware_id)
    except ValueError:
        raise NotFoundError("Firmware", body.firmware_id)
    fw = (await db.execute(select(Firmware).where(Firmware.id == fw_id))).scalar_one_or_none()
    if not fw:
        raise NotFoundError("Firmware", body.firmware_id)

    devs = (await db.execute(select(Device).where(Device.model == fw.model))).scalars().all()
    eligible = [d for d in devs if d.fw_version != fw.version]
    n = round(len(eligible) * body.percent / 100) if eligible else 0
    targets = eligible[:n] if n > 0 else []

    sent = 0
    for d in targets:
        message = {
            "type": "ota_available",
            "id": str(uuid.uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {"version": fw.version, "url": fw.storage_url, "sha256": fw.sha256, "size": fw.size},
        }
        ok = await ws.send_to_device(d.id, message)
        db.add(OTAHistory(device_id=d.id, firmware_id=fw.id, status="pending"))
        if ok:
            sent += 1
    await db.commit()

    logger.info("admin.ota_rollout", firmware_id=str(fw.id), version=fw.version, eligible=len(eligible), targeted=len(targets), sent=sent, by=admin.email)
    return {"eligible": len(eligible), "targeted": len(targets), "sent": sent, "version": fw.version, "channel": fw.channel}
