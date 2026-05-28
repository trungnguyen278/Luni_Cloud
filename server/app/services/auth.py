"""
Luni Server — Auth business logic.

Register, login, refresh, logout, profile update, password change.
"""

from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.exceptions import AuthError, ConflictError, ValidationError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models import RefreshToken, User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)

logger = structlog.get_logger()


class AuthService:
    """Authentication and user account management."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, body: RegisterRequest) -> TokenResponse:
        """Register a new user and return tokens."""
        # Check if email already exists
        result = await self.db.execute(
            select(User).where(User.email == body.email)
        )
        if result.scalar_one_or_none():
            raise ConflictError("Email already registered")

        # Create user
        user = User(
            email=body.email,
            password=hash_password(body.password),
            name=body.name,
            role="user",
        )
        self.db.add(user)
        await self.db.flush()

        # Generate tokens
        tokens = await self._create_tokens(user)

        logger.info("auth.register", user_id=str(user.id), email=user.email)
        return tokens

    async def login(self, body: LoginRequest) -> TokenResponse:
        """Authenticate user and return tokens."""
        result = await self.db.execute(
            select(User).where(User.email == body.email)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(body.password, user.password):
            raise AuthError("Invalid email or password")

        if not user.is_active:
            raise AuthError("Account is deactivated")

        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await self.db.flush()

        # Generate tokens
        tokens = await self._create_tokens(user)

        logger.info("auth.login", user_id=str(user.id), email=user.email)
        return tokens

    async def refresh(self, refresh_token_str: str) -> str:
        """Verify refresh token and issue new access token."""
        # Decode JWT refresh token
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise AuthError("Invalid refresh token")

        user_id = payload.get("sub")
        if not user_id:
            raise AuthError("Invalid refresh token")

        # Check if token exists in DB (not revoked)
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token == refresh_token_str)
        )
        db_token = result.scalar_one_or_none()

        if not db_token:
            raise AuthError("Refresh token has been revoked")

        if db_token.expires_at < datetime.now(timezone.utc):
            raise AuthError("Refresh token has expired")

        # Issue new access token
        new_access = create_access_token(data={"sub": user_id})
        return new_access

    async def logout(self, refresh_token_str: str) -> None:
        """Revoke a refresh token."""
        await self.db.execute(
            delete(RefreshToken).where(RefreshToken.token == refresh_token_str)
        )
        logger.info("auth.logout")

    async def update_profile(
        self, user: User, body: UpdateProfileRequest
    ) -> User:
        """Update user profile fields."""
        update_data = body.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)

        user.updated_at = datetime.now(timezone.utc)
        await self.db.flush()

        logger.info("auth.profile_updated", user_id=str(user.id))
        return user

    async def change_password(
        self, user: User, body: ChangePasswordRequest
    ) -> None:
        """Change user password after verifying current password."""
        if not verify_password(body.current_password, user.password):
            raise ValidationError("Current password is incorrect")

        user.password = hash_password(body.new_password)
        user.updated_at = datetime.now(timezone.utc)

        # Revoke all refresh tokens (force re-login everywhere)
        await self.db.execute(
            delete(RefreshToken).where(RefreshToken.user_id == user.id)
        )
        await self.db.flush()

        logger.info("auth.password_changed", user_id=str(user.id))

    async def _create_tokens(self, user: User) -> TokenResponse:
        """Create access + refresh token pair and store refresh in DB."""
        settings = get_settings()

        access_token = create_access_token(data={"sub": str(user.id)})

        refresh_expires = timedelta(days=settings.jwt_refresh_expire_days)
        refresh_token_str = create_refresh_token(
            data={"sub": str(user.id)},
            expires_delta=refresh_expires,
        )

        # Store refresh token in DB
        db_token = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=datetime.now(timezone.utc) + refresh_expires,
        )
        self.db.add(db_token)
        await self.db.flush()

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            user=UserResponse.model_validate(user),
        )
