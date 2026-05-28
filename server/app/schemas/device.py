"""
Luni Server — Device request/response schemas.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class DeviceCreate(BaseModel):
    """Register/pair a new device. MAC (BLE) = device identity."""
    mac: str = Field(..., pattern=r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")
    model: str = Field(default="luni_v2_s3c5", max_length=50)
    name: str = Field(default="Luni", max_length=100)


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
