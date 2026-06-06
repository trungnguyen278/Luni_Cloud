"""
Luni Server — Admin User Management API.

GET    /admin/users
GET    /admin/users/:id
PATCH  /admin/users/:id
DELETE /admin/users/:id
"""

import secrets
import uuid

import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.db.models import Device, User
from app.schemas.user import AdminUserUpdate, UserListResponse

logger = structlog.get_logger()

router = APIRouter()


class AdminCreateUser(BaseModel):
    """Admin creates an account (invite). A temp password is generated if omitted."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="user", pattern=r"^(admin|user)$")
    password: str | None = Field(default=None, min_length=6, max_length=128)


@router.post("", status_code=201)
async def create_user(
    body: AdminCreateUser,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new account (admin only). Returns the temp password when generated."""
    existing = await db.execute(select(User).where(User.email == str(body.email)))
    if existing.scalar_one_or_none():
        raise ConflictError("Email already registered", {"email": str(body.email)})

    temp_password = body.password or secrets.token_urlsafe(9)
    user = User(
        email=str(body.email),
        name=body.name,
        role=body.role,
        password=hash_password(temp_password),
    )
    db.add(user)
    await db.flush()

    logger.info("admin.user_created", user_id=str(user.id), email=user.email, by=admin.email)
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "is_active": user.is_active,
        "device_count": 0,
        "created_at": user.created_at.isoformat(),
        "last_login": None,
        "temp_password": None if body.password else temp_password,
    }


@router.get("", response_model=list[UserListResponse])
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users with device count (admin only)."""
    result = await db.execute(
        select(
            User,
            func.count(Device.id).label("device_count"),
        )
        .outerjoin(Device, Device.owner_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
    )

    users = []
    for user, device_count in result.all():
        users.append(
            UserListResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                is_active=user.is_active,
                device_count=device_count,
                created_at=user.created_at,
                last_login=user.last_login,
            )
        )
    return users


@router.get("/{user_id}", response_model=UserListResponse)
async def get_user(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get user detail with device count (admin only)."""
    result = await db.execute(
        select(
            User,
            func.count(Device.id).label("device_count"),
        )
        .outerjoin(Device, Device.owner_id == User.id)
        .where(User.id == user_id)
        .group_by(User.id)
    )

    row = result.one_or_none()
    if not row:
        raise NotFoundError("User", str(user_id))

    user, device_count = row
    return UserListResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        device_count=device_count,
        created_at=user.created_at,
        last_login=user.last_login,
    )


@router.patch("/{user_id}", response_model=UserListResponse)
async def update_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update user role or active status (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User", str(user_id))

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    await db.flush()
    logger.info("admin.user_updated", user_id=str(user_id), changes=update_data)

    # Get device count for response
    count_result = await db.execute(
        select(func.count(Device.id)).where(Device.owner_id == user_id)
    )
    device_count = count_result.scalar() or 0

    return UserListResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        device_count=device_count,
        created_at=user.created_at,
        last_login=user.last_login,
    )


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a user (admin only). Does not delete data."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User", str(user_id))

    user.is_active = False
    await db.flush()

    logger.info("admin.user_deactivated", user_id=str(user_id))
    return {"status": "ok"}
