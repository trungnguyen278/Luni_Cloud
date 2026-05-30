"""
Luni Server — Security utilities.

JWT token management, password hashing, device token generation.
"""

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

# Password hashing context (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT access token."""
    settings = get_settings()
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.jwt_access_expire_minutes
        )

    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def create_refresh_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT refresh token."""
    settings = get_settings()
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.jwt_refresh_expire_days
        )

    to_encode.update({"exp": expire, "type": "refresh", "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    """Decode and verify a JWT token. Returns payload or None."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except JWTError:
        return None


def normalize_mac(mac: str) -> str:
    """
    Canonical device identity: uppercase, colon/dash-stripped 12-hex.

    The robot firmware (getDLuniceEfuseID) uses this colon-less form
    everywhere — DEVICE_INFO, the WS auth handshake, and the admin HMAC —
    so the server stores and matches device ids in the same form.
    """
    return mac.replace(":", "").replace("-", "").upper()


def generate_device_token() -> str:
    """Generate a random 128-char hex device token for WS auth."""
    return secrets.token_hex(64)


def generate_admin_secret(mac: str) -> str:
    """
    Generate admin_secret for BLE Level 2 auth.
    admin_secret = HMAC-SHA256(mac, SERVER_SECRET_KEY)
    """
    settings = get_settings()
    return hmac.new(
        settings.secret_key.encode(),
        mac.encode(),
        hashlib.sha256,
    ).hexdigest()


def generate_ble_token(mac: str, admin_secret: str, timestamp: int) -> str:
    """
    Generate BLE token for device pairing.
    ble_token = HMAC-SHA256(mac || timestamp, admin_secret)
    """
    message = f"{mac}{timestamp}".encode()
    return hmac.new(
        admin_secret.encode(),
        message,
        hashlib.sha256,
    ).hexdigest()
