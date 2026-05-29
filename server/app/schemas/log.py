"""
Luni Server — Log schemas.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DeviceLogSchema(BaseModel):
    """Device log entry from WS."""
    level: str = Field(..., pattern=r"^(debug|info|warn|error)$")
    tag: str = Field(..., max_length=50)
    message: str
    metadata: dict | None = None

    @property
    def level_num(self) -> int:
        return LEVEL_MAP.get(self.level, 20)


class LogQuery(BaseModel):
    """Log query parameters."""
    device_id: str | None = None
    level: str | None = None
    tag: str | None = None
    from_dt: datetime | None = None
    to_dt: datetime | None = None
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class LogLevelSchema(BaseModel):
    """Change log level request."""
    level: str = Field(..., pattern=r"^(debug|info|warning|error)$")


class LogResponse(BaseModel):
    """Log entry in API responses."""
    id: int
    device_id: str
    source: str
    level: str
    tag: str
    message: str
    metadata: dict | None = Field(None, validation_alias="metadata_")
    created_at: datetime

    model_config = {"from_attributes": True}


class ServerLogResponse(BaseModel):
    """Server log entry in API responses."""
    id: int
    level: str
    module: str
    message: str
    metadata: dict | None = Field(None, validation_alias="metadata_")
    request_id: UUID | None = None
    user_id: UUID | None = None
    device_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# Log level name → numeric value mapping
LEVEL_MAP = {
    "debug": 10,
    "info": 20,
    "warn": 30,
    "warning": 30,
    "error": 40,
}
