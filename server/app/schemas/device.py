"""
Luni Server — Device request/response schemas.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.core.security import normalize_mac


class DeviceCreate(BaseModel):
    """Register/pair a new device. MAC (BLE) = device identity."""
    # Accept both colon form (AA:BB:CC:DD:EE:FF) and the robot's native
    # colon-less form (AABBCCDDEEFF); both normalize to colon-less 12-hex.
    mac: str = Field(
        ...,
        pattern=r"^(([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}|[0-9A-Fa-f]{12})$",
    )
    # Default matches the firmware constant app_meta::DLuniCE_MODEL ("Luni-C5").
    model: str = Field(default="Luni-C5", max_length=50)
    name: str = Field(default="Luni", max_length=100)

    @field_validator("mac")
    @classmethod
    def _normalize_mac(cls, v: str) -> str:
        return normalize_mac(v)


class DeviceUpdate(BaseModel):
    """Update device config."""
    name: str | None = Field(None, max_length=100)
    location: str | None = Field(None, max_length=100)
    timezone: str | None = Field(None, max_length=50)
    latitude: float | None = None
    longitude: float | None = None
    city: str | None = Field(None, max_length=100)
    config: dict | None = None


class DeviceResponse(BaseModel):
    """Device info in API responses."""
    id: str  # MAC address
    owner_id: uuid.UUID
    name: str
    model: str
    fw_version: str | None = None
    hw_version: str | None = None
    location: str | None = None
    timezone: str
    latitude: float | None = None
    longitude: float | None = None
    city: str | None = None
    config: dict
    is_online: bool
    last_seen: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DeviceRegisterResponse(BaseModel):
    """Response after successful device registration."""
    device_id: str
    device_token: str
    admin_secret: str


class BleTokenResponse(BaseModel):
    """Short-lived BLE admin (Level 2) token for the ADMIN_AUTH characteristic.

    `admin_token` is hex of HMAC-SHA256(mac || timestamp, admin_secret) (32 bytes)
    followed by the timestamp as a 4-byte little-endian integer (36 bytes total),
    written verbatim to the robot.
    """
    admin_token: str
    timestamp: int


class DeviceStatusResponse(BaseModel):
    """Realtime device status."""
    device_id: str
    is_online: bool
    last_state: dict | None = None
    last_seen: datetime | None = None


class CommandRequest(BaseModel):
    """Send command to device via WS."""
    type: str  # Command type: set_volume, set_emotion, reboot, etc.
    payload: dict = Field(default_factory=dict)


class ShareCreate(BaseModel):
    """Share device with another user."""
    email: str
    permission: str = Field(default="control", pattern=r"^(view|control)$")


class ShareResponse(BaseModel):
    """Device share info."""
    device_id: str
    user_id: uuid.UUID
    user_email: str | None = None
    user_name: str | None = None
    permission: str
    created_at: datetime

    model_config = {"from_attributes": True}
