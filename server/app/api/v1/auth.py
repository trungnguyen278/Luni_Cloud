"""
Luni Server — Auth API endpoints.

POST /auth/register, /auth/login, /auth/refresh, /auth/logout
GET  /auth/me
PATCH /auth/me
POST /auth/change-password
"""

import secrets

import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_redis, rate_limit
from app.db.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.services.auth import AuthService

logger = structlog.get_logger()

router = APIRouter()


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=255)


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=201,
    dependencies=[Depends(rate_limit("register", limit=5, window_seconds=3600))],
)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user account."""
    service = AuthService(db)
    return await service.register(body)


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit("login", limit=10, window_seconds=300))],
)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password."""
    service = AuthService(db)
    return await service.login(body)


@router.post("/refresh", response_model=dict)
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token."""
    service = AuthService(db)
    new_access = await service.refresh(body.refresh_token)
    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/logout")
async def logout(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Logout — revoke refresh token."""
    service = AuthService(db)
    await service.logout(body.refresh_token)
    return {"status": "ok"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(get_current_user),
):
    """Get current user info."""
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile."""
    service = AuthService(db)
    return await service.update_profile(user, body)


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change current user's password."""
    service = AuthService(db)
    await service.change_password(user, body)
    return {"status": "ok"}


@router.post(
    "/forgot-password",
    dependencies=[
        Depends(rate_limit("forgot_password", limit=5, window_seconds=3600))
    ],
)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Begin a password reset.

    Always responds 200 (never reveals whether the email exists). When the
    account exists, a single-use reset token is stored in Redis (1h TTL) and
    logged — wire an email/SMS sender here when delivery infra is available.
    """
    email = body.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        token = secrets.token_urlsafe(32)
        try:
            await redis.setex(f"pwreset:{token}", 3600, str(user.id))
        except Exception:
            logger.warning("auth.password_reset_redis_unavailable")
        logger.info(
            "auth.password_reset_requested",
            user_id=str(user.id),
            reset_token=token,
        )

    return {"status": "ok"}
