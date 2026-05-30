"""
Luni Server — Auth API endpoints.

POST /auth/register, /auth/login, /auth/refresh, /auth/logout
GET  /auth/me
PATCH /auth/me
POST /auth/change-password
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, rate_limit
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

router = APIRouter()


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
