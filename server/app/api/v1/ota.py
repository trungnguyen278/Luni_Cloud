"""
Luni Server — OTA / Firmware update API endpoints.

GET  /ota/check?device_id=&current_version=   — is there a newer firmware?
POST /devices/{device_id}/ota                 — push ota_available to the device

The robot firmware (esp32-c5 WsMessageHandler::handleOtaAvailable) downloads
from the `url`, verifies `sha256`, flashes, and reports `ota_progress` — which
the WS manager already relays to app clients.
"""

import time
import uuid

import structlog
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_ws_manager
from app.api.v1.devices import _get_device_with_access
from app.core.exceptions import NotFoundError
from app.db.models import Firmware, OTAHistory, User
from app.services.ws_manager import ConnectionManager

logger = structlog.get_logger()

router = APIRouter()


class OtaTriggerRequest(BaseModel):
    """Trigger an OTA to a specific firmware build."""
    firmware_id: str = Field(..., description="Firmware UUID from /ota/check")


async def _latest_firmware(db: AsyncSession, model: str) -> Firmware | None:
    """Latest active firmware on the stable channel for a device model."""
    result = await db.execute(
        select(Firmware)
        .where(
            Firmware.model == model,
            Firmware.is_active.is_(True),
            Firmware.channel == "stable",
        )
        .order_by(Firmware.created_at.desc())
    )
    return result.scalars().first()


@router.get("/ota/check")
async def ota_check(
    device_id: str,
    current_version: str = Query(default=""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check whether a newer firmware exists for the device's model."""
    device = await _get_device_with_access(device_id, user, db)

    fw = await _latest_firmware(db, device.model)
    if not fw or fw.version == current_version:
        return {"available": False}

    return {
        "available": True,
        "firmware_id": str(fw.id),
        "version": fw.version,
        "model": fw.model,
        "sha256": fw.sha256,
        "size": fw.size,
        "changelog": fw.changelog or "",
        "channel": fw.channel,
        "created_at": fw.created_at.isoformat(),
    }


@router.post("/devices/{device_id}/ota")
async def ota_trigger(
    device_id: str,
    body: OtaTriggerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ws_mgr: ConnectionManager = Depends(get_ws_manager),
):
    """Send an `ota_available` command to the device to start the update."""
    device = await _get_device_with_access(device_id, user, db, require_owner=True)

    try:
        fw_id = uuid.UUID(body.firmware_id)
    except ValueError:
        raise NotFoundError("Firmware", body.firmware_id)

    fw = (
        await db.execute(select(Firmware).where(Firmware.id == fw_id))
    ).scalar_one_or_none()
    if not fw:
        raise NotFoundError("Firmware", body.firmware_id)

    history = OTAHistory(device_id=device.id, firmware_id=fw.id, status="pending")
    db.add(history)
    await db.flush()

    message = {
        "type": "ota_available",
        "id": str(uuid.uuid4()),
        "ts": int(time.time() * 1000),
        "payload": {
            "version": fw.version,
            "url": fw.storage_url,
            "sha256": fw.sha256,
            "size": fw.size,
        },
    }
    sent = await ws_mgr.send_to_device(device.id, message)
    await db.commit()

    logger.info(
        "ota.triggered",
        device_id=device.id,
        firmware_id=str(fw.id),
        version=fw.version,
        sent=sent,
    )
    return {"status": "ok", "sent": sent, "firmware_id": str(fw.id)}
