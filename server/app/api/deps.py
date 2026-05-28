"""
Luni Server — FastAPI dependency injection.

Common dependencies: DB session, current user, admin check, Redis, WS manager.
"""

import uuid

import redis.asyncio as aioredis
import structlog
from fastapi import Depends, Header, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.exceptions import AuthError, ForbiddenError, TokenExpiredError
from app.core.security import decode_token
from app.db.database import get_db
from app.db.models import User
from app.services.ws_manager import manager

logger = structlog.get_logger()

# Bearer token scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and verify JWT from Authorization header, return User."""
    if not credentials:
        raise AuthError("Missing authorization header")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise TokenExpiredError()

    if payload.get("type") != "access":
        raise AuthError("Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthError("Invalid token payload")

    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise AuthError("Invalid user ID in token")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()

    if not user:
        raise AuthError("User not found")

    if not user.is_active:
        raise ForbiddenError("Account is deactivated")

    return user


async def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    """Require admin role."""
    if user.role != "admin":
        raise ForbiddenError("Admin access required")
    return user


async def get_redis() -> aioredis.Redis:
    """Get Redis client from WS manager (shared connection)."""
    if manager.redis is None:
        settings = get_settings()
        manager.redis = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
        )
    return manager.redis


def get_ws_manager():
    """Get the WebSocket connection manager singleton."""
    return manager


def get_settings_dep() -> Settings:
    """Settings dependency."""
    return get_settings()


async def get_ws_token(
    token: str = Query(..., description="JWT access token for WebSocket auth"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Authenticate WebSocket connections via query parameter token."""
    payload = decode_token(token)
    if not payload:
        raise AuthError("Invalid or expired token")

    if payload.get("type") != "access":
        raise AuthError("Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthError("Invalid token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise AuthError("User not found or inactive")

    return user
