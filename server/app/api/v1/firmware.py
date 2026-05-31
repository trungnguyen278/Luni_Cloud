"""
Luni Server — Admin firmware management + OTA binary download.

Admin (role=admin) uploads firmware images here; they're stored via
FirmwareStorage (Cloudflare R2 or local volume) and catalogued in the
`firmware` table. The robot downloads the binary from the public-by-UUID
`/firmware/{id}/download` endpoint (the URL placed in `ota_available`), so OTA
always flows over the same trusted domain (lunirobot.io.vn) the device uses.
"""

import hashlib
import uuid

import structlog
from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.config import get_settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.db.models import Firmware, OTAHistory, User
from app.services.firmware import FirmwareStorage

logger = structlog.get_logger()

router = APIRouter()

_MAX_FIRMWARE_BYTES = 16 * 1024 * 1024  # 16 MB ceiling (nginx caps body at 20M)


def _download_url(firmware_id: uuid.UUID) -> str:
    """Public download URL the robot will GET during OTA."""
    domain = get_settings().domain
    scheme = "http" if domain in ("localhost", "127.0.0.1") else "https"
    return f"{scheme}://{domain}/api/v1/firmware/{firmware_id}/download"


def _serialize(fw: Firmware, installed: int = 0) -> dict:
    return {
        "id": str(fw.id),
        "version": fw.version,
        "model": fw.model,
        "channel": fw.channel,
        "size": fw.size,
        "sha256": fw.sha256,
        "changelog": fw.changelog or "",
        "is_active": fw.is_active,
        "storage_url": fw.storage_url,
        "installed": installed,
        "created_at": fw.created_at.isoformat(),
    }


@router.get("/admin/firmware")
async def list_firmware(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all firmware builds with install counts (admin only)."""
    rows = await db.execute(select(Firmware).order_by(Firmware.created_at.desc()))
    firmwares = list(rows.scalars().all())

    # Completed-OTA counts per firmware for the "đã cài" column.
    counts = dict(
        (
            await db.execute(
                select(OTAHistory.firmware_id, func.count())
                .where(OTAHistory.status == "completed")
                .group_by(OTAHistory.firmware_id)
            )
        ).all()
    )

    return [_serialize(fw, int(counts.get(fw.id, 0))) for fw in firmwares]


@router.post("/admin/firmware", status_code=201)
async def upload_firmware(
    file: UploadFile = File(...),
    version: str = Form(...),
    model: str = Form("Luni-C5"),
    channel: str = Form("stable"),
    changelog: str = Form(""),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upload a new firmware image (admin only)."""
    if channel not in ("stable", "beta"):
        raise ValidationError("channel must be 'stable' or 'beta'")

    data = await file.read()
    if not data:
        raise ValidationError("Empty firmware file")
    if len(data) > _MAX_FIRMWARE_BYTES:
        raise ValidationError("Firmware exceeds 16 MB limit")

    # (version, model) is unique — reject duplicates up front for a clean 409.
    existing = await db.execute(
        select(Firmware).where(
            Firmware.version == version, Firmware.model == model
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictError(
            "Firmware version already exists for this model",
            {"version": version, "model": model},
        )

    sha256 = hashlib.sha256(data).hexdigest()
    fw_id = uuid.uuid4()
    storage_key = f"{model}/{version}/{fw_id}.bin"

    storage = FirmwareStorage(get_settings())
    await storage.save(storage_key, data)

    fw = Firmware(
        id=fw_id,
        version=version,
        model=model,
        storage_url=_download_url(fw_id),
        sha256=sha256,
        size=len(data),
        changelog=changelog or None,
        channel=channel,
        is_active=True,
    )
    # storage_key lives in metadata-free convention: re-derivable as
    # "{model}/{version}/{id}.bin" for download/delete.
    db.add(fw)
    await db.commit()

    logger.info(
        "firmware.uploaded",
        firmware_id=str(fw_id),
        version=version,
        model=model,
        channel=channel,
        size=len(data),
        admin_id=str(admin.id),
    )
    return _serialize(fw)


@router.delete("/admin/firmware/{firmware_id}")
async def delete_firmware(
    firmware_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a firmware build and its stored binary (admin only)."""
    fw = (
        await db.execute(select(Firmware).where(Firmware.id == firmware_id))
    ).scalar_one_or_none()
    if not fw:
        raise NotFoundError("Firmware", str(firmware_id))

    storage = FirmwareStorage(get_settings())
    await storage.delete(f"{fw.model}/{fw.version}/{fw.id}.bin")

    await db.delete(fw)
    await db.commit()
    logger.info("firmware.deleted", firmware_id=str(firmware_id), admin_id=str(admin.id))
    return {"status": "ok"}


@router.get("/firmware/{firmware_id}/download")
async def download_firmware(
    firmware_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Stream a firmware binary. Public-by-UUID so the robot's HTTP OTA client can
    fetch it without a JWT (the unguessable id is the capability).
    """
    fw = (
        await db.execute(select(Firmware).where(Firmware.id == firmware_id))
    ).scalar_one_or_none()
    if not fw or not fw.is_active:
        raise NotFoundError("Firmware", str(firmware_id))

    storage = FirmwareStorage(get_settings())
    data = await storage.read(f"{fw.model}/{fw.version}/{fw.id}.bin")
    if data is None:
        raise NotFoundError("Firmware binary", str(firmware_id))

    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{fw.model}-{fw.version}.bin"',
            "X-Firmware-SHA256": fw.sha256,
        },
    )
