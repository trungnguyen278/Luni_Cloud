"""
Luni Server — User management schemas (admin).
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UserListResponse(BaseModel):
    """User info for admin list view."""
    id: uuid.UUID
    email: str
    name: str
    role: str
    is_active: bool
    device_count: int = 0
    created_at: datetime
    last_login: datetime | None = None

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    """Admin update user — role and active status."""
    role: str | None = Field(None, pattern=r"^(admin|user)$")
    is_active: bool | None = None
