"""Password hashing and JWT access/refresh token utilities."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import uuid4

import bcrypt
import jwt
from fastapi import status

from app.core.config import Settings
from app.core.exceptions import AppAuthException, AuthErrorCode

MAX_BCRYPT_BYTES = 72


@dataclass(frozen=True)
class DecodedToken:
    """Validated claims extracted from a JWT."""

    sub: int
    jti: str
    token_type: Literal["access", "refresh"]
    expires_at: datetime
    email: str | None = None
    role: str | None = None


def validate_password_strength(password: str) -> str:
    """Enforce baseline password policy and bcrypt 72-byte ceiling."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if len(password.encode("utf-8")) > MAX_BCRYPT_BYTES:
        raise ValueError("Password must not exceed 72 bytes.")
    if not any(ch.isalpha() for ch in password) or not any(ch.isdigit() for ch in password):
        raise ValueError("Password must include at least one letter and one number.")
    return password


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    validate_password_strength(password)
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12))
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    plain_bytes = plain_password.encode("utf-8")
    if len(plain_bytes) > MAX_BCRYPT_BYTES:
        return False
    try:
        return bcrypt.checkpw(plain_bytes, hashed_password.encode("utf-8"))
    except ValueError:
        return False


def _build_token(
    payload: dict[str, object],
    expires_delta: timedelta,
    settings: Settings,
) -> tuple[str, str, datetime]:
    now = datetime.now(UTC)
    expires_at = now + expires_delta
    jti = uuid4().hex
    claims = {
        **payload,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    encoded = jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded, jti, expires_at


def create_access_token(
    user_id: int,
    email: str,
    role: str,
    settings: Settings,
) -> tuple[str, str, datetime]:
    """Generate a signed short-lived JWT access token."""
    return _build_token(
        payload={"sub": str(user_id), "email": email, "role": role, "type": "access"},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        settings=settings,
    )


def create_refresh_token(user_id: int, settings: Settings) -> tuple[str, str, datetime]:
    """Generate a signed longer-lived JWT refresh token."""
    return _build_token(
        payload={"sub": str(user_id), "type": "refresh"},
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        settings=settings,
    )


def decode_jwt_token(
    token: str,
    expected_type: Literal["access", "refresh"],
    settings: Settings,
) -> DecodedToken:
    """Decode and validate a JWT signature, expiry, claims, and token type."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.TOKEN_EXPIRED,
            detail="Authentication token has expired. Please sign in again.",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.INVALID_TOKEN,
            detail="Invalid authentication token.",
        ) from exc

    token_type = payload.get("type")
    if token_type != expected_type:
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.WRONG_TOKEN_TYPE,
            detail=f"Expected a '{expected_type}' token.",
        )

    sub_raw = payload.get("sub")
    jti = payload.get("jti")
    exp_raw = payload.get("exp")
    if not sub_raw or not jti or not exp_raw:
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.INVALID_TOKEN,
            detail="Authentication token is missing required claims.",
        )

    try:
        user_id = int(sub_raw)
    except (TypeError, ValueError) as exc:
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.INVALID_TOKEN,
            detail="Authentication token subject is invalid.",
        ) from exc

    return DecodedToken(
        sub=user_id,
        jti=str(jti),
        token_type=expected_type,
        expires_at=datetime.fromtimestamp(int(exp_raw), tz=UTC),
        email=payload.get("email"),
        role=payload.get("role"),
    )

