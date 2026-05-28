"""
Luni Server — Interaction API endpoints (text chat with device via AI).
"""

import time

import httpx
import structlog
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_redis
from app.config import get_settings
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.models import Device, DeviceShare, User
from app.schemas.interaction import InteractRequest, InteractResponse, InteractionResponse
from app.services.ai import AIService
from app.services.interaction import InteractionService
from app.services.sync_data import SyncDataService

logger = structlog.get_logger()

router = APIRouter()


async def _get_device_with_access(
    device_id: str, user: User, db: AsyncSession, require_owner: bool = False
) -> Device:
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise NotFoundError("Device", device_id)

    if user.role == "admin":
        return device
    if device.owner_id == user.id:
        return device
    if require_owner:
        raise ForbiddenError("Only device owner can perform this action")

    share = await db.execute(
        select(DeviceShare).where(
            DeviceShare.device_id == device_id,
            DeviceShare.user_id == user.id,
        )
    )
    if not share.scalar_one_or_none():
        raise ForbiddenError("No access to this device")
    return device


@router.post("/devices/{device_id}/interact", response_model=InteractResponse)
async def interact(
    device_id: str,
    body: InteractRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Send text to device via AI pipeline (chat -> TTS -> WS push)."""
    device = await _get_device_with_access(device_id, user, db)

    device_context = None
    try:
        sync_service = SyncDataService(redis, db)
        device_context = await sync_service.build_sync_payload(device)
    except Exception:
        pass

    interaction_service = InteractionService(db)
    history_rows = await interaction_service.get_history(device_id=device_id, limit=10)
    history = [
        {
            "direction": row.direction,
            "input_text": row.input_text,
            "output_text": row.output_text,
        }
        for row in history_rows
    ]

    ai = AIService(get_settings())
    start_time = time.time()

    try:
        result = await ai.process_text_interaction(
            text=body.text,
            device_id=device_id,
            user_id=str(user.id),
            device_context=device_context,
            conversation_history=history,
        )
    except (httpx.ConnectError, httpx.ConnectTimeout):
        return JSONResponse(
            status_code=503,
            content={"detail": "AI service unavailable"},
        )

    latency_ms = int((time.time() - start_time) * 1000)

    interaction = await interaction_service.save(
        device_id=device_id,
        user_id=user.id,
        direction="user_to_device",
        source=body.source,
        input_text=body.text,
        output_text=result["text"],
        emotion=result["emotion"],
        latency_ms=latency_ms,
    )
    await db.commit()

    return InteractResponse(
        input=body.text,
        output=result["text"],
        emotion=result["emotion"],
        latency_ms=latency_ms,
        interaction_id=interaction.id,
    )


@router.get(
    "/devices/{device_id}/interactions",
    response_model=list[InteractionResponse],
)
async def get_interactions(
    device_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get interaction history for a device (paginated)."""
    await _get_device_with_access(device_id, user, db)
    service = InteractionService(db)
    return await service.get_history(device_id=device_id, limit=limit, offset=offset)


@router.delete("/devices/{device_id}/interactions")
async def clear_interactions(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear interaction history for a device (owner only)."""
    await _get_device_with_access(device_id, user, db, require_owner=True)
    service = InteractionService(db)
    await service.clear_history(device_id)
    await db.commit()
    return {"status": "ok"}
