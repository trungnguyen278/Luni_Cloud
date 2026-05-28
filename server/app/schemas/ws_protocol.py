"""
Luni Server — WebSocket message schemas.

Standard WS message format:
{
    "type": "<message_type>",
    "id": "uuid-v4",
    "ts": 1716825600000,
    "payload": { ... }
}
"""

from pydantic import BaseModel, Field


class WSMessage(BaseModel):
    """Base WebSocket message."""
    type: str
    id: str = ""
    ts: int = 0
    payload: dict = Field(default_factory=dict)


class AuthPayload(BaseModel):
    """Device auth payload."""
    device_token: str
    mac: str
    fw_version: str = ""
    model: str = ""


class HeartbeatPayload(BaseModel):
    """Device heartbeat payload."""
    uptime: int = 0
    free_heap: int = 0
    rssi: int = 0


class StateUpdatePayload(BaseModel):
    """Device state change payload."""
    category: str  # interaction | connectivity | power | emotion
    old: int = 0
    new: int = 0


class BatteryPayload(BaseModel):
    """Battery status payload."""
    voltage: float = 0.0
    percent: int = 0
    charging: bool = False


class DeviceInfoPayload(BaseModel):
    """Device info payload (sent after auth)."""
    mac: str = ""
    fw_version: str = ""
    model: str = ""
    uptime: int = 0
    hw_version: str = ""


class ErrorPayload(BaseModel):
    """Device error payload."""
    code: str = ""
    message: str = ""
    severity: str = "error"  # warn | error | critical


class OTAProgressPayload(BaseModel):
    """OTA progress payload."""
    percent: int = 0
    phase: str = "download"  # download | verify | flash
