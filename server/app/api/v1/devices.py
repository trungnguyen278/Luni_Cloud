"""
Luni Server — Device Management API endpoints.

CRUD devices, pairing, sharing, commands.
"""

import time
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_ws_manager
from app.core.exceptions import ConflictError, DeviceOfflineError, ForbiddenError, NotFoundError
from app.core.security import (
    generate_admin_secret,
    generate_ble_token,
    generate_device_token,
    normalize_mac,
)
from app.db.models import Device, DeviceShare, User
from app.schemas.device import (
    BleTokenResponse,
    CommandRequest,
    DeviceCreate,
    DeviceRegisterResponse,
    DeviceResponse,
    DeviceStatusResponse,
    DeviceUpdate,
    ShareCreate,
    ShareResponse,
)
from app.services.ws_manager import ConnectionManager

logger = structlog.get_logger()

router = APIRouter()


# === Helper: check device access ===

async def _get_device_with_access(
    device_id: str,
    user: User,
    db: AsyncSession,
    require_owner: bool = False,
) -> Device:
    """Get device and verify user has access (owner or shared)."""
    device_id = normalize_mac(device_id)
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()

    if not device:
        raise NotFoundError("Device", device_id)

    # Admin can access any device
    if user.role == "admin":
        return device

    # Owner
    if device.owner_id == user.id:
        return device

    if require_owner:
        raise ForbiddenError("Only device owner can perform this action")

    # Check shared access
    share_result = await db.execute(
        select(DeviceShare).where(
            DeviceShare.device_id == device_id,
            DeviceShare.user_id == user.id,
        )
    )
    share = share_result.scalar_one_or_none()

    if not share:
        raise ForbiddenError("No access to this device")

    return device


# === Endpoints ===


@router.get("", response_model=list[DeviceResponse])
async def list_devices(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's devices (owned + shared)."""
    # Owned devices
    owned = await db.execute(
        select(Device).where(Device.owner_id == user.id)
    )
    devices = list(owned.scalars().all())

    # Shared devices
    shared = await db.execute(
        select(Device)
        .join(DeviceShare, DeviceShare.device_id == Device.id)
        .where(DeviceShare.user_id == user.id)
    )
    devices.extend(shared.scalars().all())

    return devices


@router.post("", response_model=DeviceRegisterResponse, status_code=201)
async def register_device(
    body: DeviceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Register/pair a new device.
    MAC (BLE) = device identity.
    Re-register same MAC + same owner → new device_token.
    Re-register same MAC + different owner → 409 CONFLICT.
    """
    mac = body.mac  # already normalized to colon-less 12-hex by the schema

    # Check if device already exists
    result = await db.execute(select(Device).where(Device.id == mac))
    existing = result.scalar_one_or_none()

    if existing:
        if existing.owner_id != user.id:
            raise ConflictError(
                "Device already registered to another user",
                {"device_id": mac},
            )
        # Re-register: generate new token
        device_token = generate_device_token()
        existing.device_token = device_token
        existing.name = body.name
        existing.model = body.model
        existing.updated_at = datetime.now(timezone.utc)
        await db.flush()

        admin_secret = generate_admin_secret(mac)
        logger.info("device.re_registered", device_id=mac, user_id=str(user.id))

        return DeviceRegisterResponse(
            device_id=mac,
            device_token=device_token,
            admin_secret=admin_secret,
        )

    # New registration
    device_token = generate_device_token()
    device = Device(
        id=mac,
        owner_id=user.id,
        name=body.name,
        model=body.model,
        device_token=device_token,
    )
    db.add(device)
    await db.flush()

    admin_secret = generate_admin_secret(mac)
    logger.info("device.registered", device_id=mac, user_id=str(user.id))

    return DeviceRegisterResponse(
        device_id=mac,
        device_token=device_token,
        admin_secret=admin_secret,
    )


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get device detail."""
    device = await _get_device_with_access(device_id, user, db)
    return device


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: str,
    body: DeviceUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update device config (name, timezone, location, log_level)."""
    device = await _get_device_with_access(device_id, user, db, require_owner=True)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "config" and value is not None:
            # Merge config
            current_config = device.config or {}
            current_config.update(value)
            device.config = current_config
        else:
            setattr(device, key, value)

    device.updated_at = datetime.now(timezone.utc)
    await db.flush()

    logger.info("device.updated", device_id=device_id)
    return device


@router.delete("/{device_id}")
async def delete_device(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unregister device."""
    device = await _get_device_with_access(device_id, user, db, require_owner=True)
    await db.delete(device)
    logger.info("device.deleted", device_id=device_id)
    return {"status": "ok"}


@router.get("/{device_id}/status", response_model=DeviceStatusResponse)
async def get_device_status(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get realtime device status."""
    device = await _get_device_with_access(device_id, user, db)
    return DeviceStatusResponse(
        device_id=device.id,
        is_online=device.is_online,
        last_state=device.last_state,
        last_seen=device.last_seen,
    )


@router.post("/{device_id}/ble-token", response_model=BleTokenResponse)
async def issue_ble_token(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Issue a short-lived BLE admin (Level 2) token for the app to write to the
    robot's ADMIN_AUTH characteristic (0x0012).

    The firmware verifies a 36-byte blob: HMAC-SHA256(mac || timestamp_str,
    admin_secret) (32 bytes) followed by the timestamp as a 4-byte LE integer.
    We return that blob as hex in `admin_token` so the app can write it
    verbatim. `mac` here is the canonical colon-less device id, matching the
    firmware's getDLuniceEfuseID().
    """
    device = await _get_device_with_access(device_id, user, db, require_owner=True)

    mac = normalize_mac(device.id)
    admin_secret = generate_admin_secret(mac)
    timestamp = int(time.time())
    hmac_hex = generate_ble_token(mac, admin_secret, timestamp)
    # Firmware reads the timestamp from the trailing 4 bytes (little-endian).
    admin_token = hmac_hex + timestamp.to_bytes(4, "little").hex()

    logger.info("device.ble_token_issued", device_id=mac, user_id=str(user.id))
    return BleTokenResponse(admin_token=admin_token, timestamp=timestamp)


@router.post("/{device_id}/command")
async def send_command(
    device_id: str,
    body: CommandRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ws_mgr: ConnectionManager = Depends(get_ws_manager),
):
    """Send command to device via WebSocket."""
    device = await _get_device_with_access(device_id, user, db)

    message = {
        "type": body.type,
        "id": str(uuid.uuid4()),
        "ts": int(time.time() * 1000),
        "payload": body.payload,
    }

    sent = await ws_mgr.send_to_device(device_id, message)
    if not sent:
        raise DeviceOfflineError(device_id)

    logger.info("device.command_sent", device_id=device_id, command=body.type)
    return {"status": "ok", "message_id": message["id"]}


@router.post("/{device_id}/share", status_code=201)
async def share_device(
    device_id: str,
    body: ShareCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Share device with another user by email."""
    device = await _get_device_with_access(device_id, user, db, require_owner=True)

    # Find target user
    result = await db.execute(select(User).where(User.email == body.email))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise NotFoundError("User", body.email)

    if target_user.id == user.id:
        raise ConflictError("Cannot share device with yourself")

    # Check if already shared
    existing = await db.execute(
        select(DeviceShare).where(
            DeviceShare.device_id == device_id,
            DeviceShare.user_id == target_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictError("Device already shared with this user")

    share = DeviceShare(
        device_id=device_id,
        user_id=target_user.id,
        permission=body.permission,
    )
    db.add(share)
    await db.flush()

    logger.info(
        "device.shared",
        device_id=device_id,
        shared_with=str(target_user.id),
    )
    return {"status": "ok"}


@router.get("/{device_id}/shares", response_model=list[ShareResponse])
async def list_shares(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List device shares."""
    device = await _get_device_with_access(device_id, user, db, require_owner=True)

    result = await db.execute(
        select(DeviceShare, User)
        .join(User, DeviceShare.user_id == User.id)
        .where(DeviceShare.device_id == device_id)
    )

    shares = []
    for share, shared_user in result.all():
        shares.append(
            ShareResponse(
                device_id=share.device_id,
                user_id=share.user_id,
                user_email=shared_user.email,
                user_name=shared_user.name,
                permission=share.permission,
                created_at=share.created_at,
            )
        )
    return shares


@router.delete("/{device_id}/shares/{user_id}")
async def remove_share(
    device_id: str,
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove device share."""
    device = await _get_device_with_access(device_id, user, db, require_owner=True)

    result = await db.execute(
        select(DeviceShare).where(
            DeviceShare.device_id == device_id,
            DeviceShare.user_id == user_id,
        )
    )
    share = result.scalar_one_or_none()
    if not share:
        raise NotFoundError("Share")

    await db.delete(share)
    logger.info("device.share_removed", device_id=device_id, user_id=str(user_id))
    return {"status": "ok"}
