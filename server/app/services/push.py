"""
Luni Server — FCM push sender.

Sends Firebase Cloud Messaging notifications to a user's registered devices
(the tokens stored by POST /push/register).

Graceful degradation: if `firebase-admin` isn't installed or
`FCM_CREDENTIALS_FILE` isn't configured, every send is a logged no-op so the
rest of the system keeps working without push credentials.
"""

import asyncio

import structlog
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import PushToken

logger = structlog.get_logger()

# Resolved lazily on first send: True = ready, False = unavailable, None = unknown.
_fcm_ready: bool | None = None
_messaging = None


def _ensure_fcm() -> bool:
    """Initialise the Firebase app once. Returns True if FCM can send."""
    global _fcm_ready, _messaging
    if _fcm_ready is not None:
        return _fcm_ready

    settings = get_settings()
    cred_file = settings.fcm_credentials_file
    if not cred_file:
        logger.info("push.fcm_disabled", reason="no_credentials_configured")
        _fcm_ready = False
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials, messaging

        if not firebase_admin._apps:
            firebase_admin.initialize_app(credentials.Certificate(cred_file))
        _messaging = messaging
        _fcm_ready = True
        logger.info("push.fcm_ready")
    except Exception as e:  # ImportError or bad credentials
        logger.warning("push.fcm_init_failed", error=str(e))
        _fcm_ready = False

    return _fcm_ready


async def send_to_user(
    db: AsyncSession,
    user_id,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> int:
    """
    Push a notification to every device token registered to `user_id`.

    Returns the number of messages accepted by FCM (0 when push is disabled).
    Invalid/expired tokens are pruned from the DB.
    """
    if not _ensure_fcm():
        return 0

    rows = await db.execute(
        select(PushToken.token).where(PushToken.user_id == user_id)
    )
    tokens = [t for (t,) in rows.all()]
    if not tokens:
        return 0

    def _send() -> tuple[int, list[str]]:
        message = _messaging.MulticastMessage(
            tokens=tokens,
            notification=_messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
        )
        resp = _messaging.send_each_for_multicast(message)
        invalid = [
            tokens[i]
            for i, r in enumerate(resp.responses)
            if not r.success
            and r.exception is not None
            and "registration-token-not-registered" in str(r.exception).lower()
        ]
        return resp.success_count, invalid

    try:
        success_count, invalid = await asyncio.to_thread(_send)
    except Exception as e:
        logger.warning("push.send_failed", user_id=str(user_id), error=str(e))
        return 0

    if invalid:
        await db.execute(delete(PushToken).where(PushToken.token.in_(invalid)))
        await db.commit()
        logger.info("push.pruned_tokens", count=len(invalid))

    logger.info("push.sent", user_id=str(user_id), delivered=success_count)
    return success_count
