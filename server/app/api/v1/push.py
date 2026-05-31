"""
Luni Server — Push notification token registration.

POST /push/register  — store an FCM token for the current user.

Dispatch is handled by app.services.push (firebase-admin), which fans out to
these tokens on events like device-offline. Sending no-ops gracefully when
FCM_CREDENTIALS_FILE is unset, so registration works with or without creds.
"""

import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.db.models import PushToken, User

logger = structlog.get_logger()

router = APIRouter()


class PushRegisterRequest(BaseModel):
    token: str = Field(..., max_length=512)
    platform: str = Field(default="fcm", max_length=20)


@router.post("/push/register")
async def register_push_token(
    body: PushRegisterRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register (or re-assign) an FCM push token to the current user."""
    existing = (
        await db.execute(select(PushToken).where(PushToken.token == body.token))
    ).scalar_one_or_none()

    if existing:
        existing.user_id = user.id
        existing.platform = body.platform
    else:
        db.add(PushToken(user_id=user.id, token=body.token, platform=body.platform))

    await db.commit()
    logger.info("push.token_registered", user_id=str(user.id), platform=body.platform)
    return {"status": "ok"}
