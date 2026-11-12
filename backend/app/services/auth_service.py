"""Core authentication, credential verification, token issuance, and logout services."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi import status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import AppAuthException, AuthErrorCode
from app.core.rate_limiter import rate_limiter
from app.core.security import (
    DecodedToken,
    create_access_token,
    create_refresh_token,
    decode_jwt_token,
    hash_password,
    verify_password,
)
from app.db.session import ensure_utc
from app.models import AuthAuditLog, RevokedToken, User
from app.models.user import SELF_REGISTER_ROLES
from app.schemas.auth import RegisterRequest, TokenResponse, UserResponse


@dataclass(frozen=True)
class RequestContext:
    """Client metadata captured for rate limiting and security audit logging."""

    ip_address: str | None = None
    user_agent: str | None = None


def record_audit_log(
    db: Session,
    *,
    event_type: str,
    success: bool,
    detail: str,
    context: RequestContext,
    user_id: int | None = None,
    email: str | None = None,
) -> None:
    """Persist an authentication audit trail event."""
    db.add(
        AuthAuditLog(
            user_id=user_id,
            email=email,
            event_type=event_type,
            success=success,
            detail=detail[:255],
            ip_address=(context.ip_address or "")[:64] or None,
            user_agent=(context.user_agent or "")[:255] or None,
        )
    )
    db.commit()


def is_token_revoked(db: Session, jti: str) -> bool:
    """Return True if the JWT ID has been explicitly revoked via logout or rotation."""
    found = db.scalar(select(RevokedToken.id).where(RevokedToken.jti == jti))
    return found is not None


def _revoke_token_jti(
    db: Session,
    *,
    jti: str,
    token_type: str,
    user_id: int,
    expires_at: datetime,
) -> bool:
    """Insert a token JTI into the revocation list if not already revoked."""
    if is_token_revoked(db, jti):
        return False
    db.add(
        RevokedToken(
            jti=jti,
            token_type=token_type,
            user_id=user_id,
            expires_at=expires_at,
        )
    )
    return True


def purge_expired_revoked_tokens(db: Session) -> None:
    """Remove already-expired JTIs so the blocklist does not grow unboundedly."""
    db.execute(delete(RevokedToken).where(RevokedToken.expires_at < datetime.now(UTC)))
    db.commit()


def issue_token_pair(user: User, settings: Settings) -> TokenResponse:
    """Generate a fresh JWT access and refresh token pair for an authenticated user."""
    access_token, _, _ = create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role,
        settings=settings,
    )
    refresh_token, _, _ = create_refresh_token(user_id=user.id, settings=settings)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


def register_user(
    db: Session,
    payload: RegisterRequest,
    settings: Settings,
    context: RequestContext,
) -> User:
    """Register a new Patient, Doctor, or Clinic account."""
    rate_limiter.check(
        key=f"register:{context.ip_address or 'unknown'}",
        max_requests=settings.LOGIN_RATE_LIMIT_MAX_REQUESTS,
        window_seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    )

    if payload.role not in SELF_REGISTER_ROLES:
        record_audit_log(
            db,
            event_type="register_rejected_role",
            success=False,
            detail=f"Self-registration attempted for restricted role '{payload.role.value}'.",
            context=context,
            email=payload.email,
        )
        raise AppAuthException(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=AuthErrorCode.ROLE_NOT_ALLOWED,
            detail="Admin accounts cannot be self-registered.",
        )

    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        record_audit_log(
            db,
            event_type="register_conflict",
            success=False,
            detail="Registration attempted with an already-registered email.",
            context=context,
            email=payload.email,
        )
        raise AppAuthException(
            status_code=status.HTTP_409_CONFLICT,
            error_code=AuthErrorCode.EMAIL_ALREADY_EXISTS,
            detail="An account with this email already exists.",
        )

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role.value,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    record_audit_log(
        db,
        event_type="register_success",
        success=True,
        detail=f"Registered new {user.role} account.",
        context=context,
        user_id=user.id,
        email=user.email,
    )
    return user


def authenticate_user(
    db: Session,
    *,
    email: str,
    password: str,
    settings: Settings,
    context: RequestContext,
) -> User:
    """Verify credentials, enforce lockout and rate limits, and record audit logs."""
    normalized_email = email.strip().lower()
    rate_limiter.check(
        key=f"login:{context.ip_address or 'unknown'}:{normalized_email}",
        max_requests=settings.LOGIN_RATE_LIMIT_MAX_REQUESTS,
        window_seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    )

    user = db.scalar(select(User).where(User.email == normalized_email))
    now = datetime.now(UTC)

    if user is None:
        record_audit_log(
            db,
            event_type="login_failed",
            success=False,
            detail="Login attempted for unknown email.",
            context=context,
            email=normalized_email,
        )
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.INVALID_CREDENTIALS,
            detail="Invalid email or password.",
        )

    locked_until = ensure_utc(user.locked_until)
    if locked_until is not None and locked_until > now:
        remaining_seconds = max(1, int((locked_until - now).total_seconds()))
        record_audit_log(
            db,
            event_type="login_blocked_locked",
            success=False,
            detail="Login blocked due to temporary account lockout.",
            context=context,
            user_id=user.id,
            email=user.email,
        )
        raise AppAuthException(
            status_code=status.HTTP_423_LOCKED,
            error_code=AuthErrorCode.ACCOUNT_LOCKED,
            detail=f"Account temporarily locked after repeated failed attempts. Try again in {remaining_seconds} seconds.",
            extra={"retry_after_seconds": remaining_seconds},
        )

    if not verify_password(password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
            detail = "Account locked after maximum failed login attempts."
        else:
            detail = "Invalid password provided."
        db.commit()

        record_audit_log(
            db,
            event_type="login_failed",
            success=False,
            detail=detail,
            context=context,
            user_id=user.id,
            email=user.email,
        )
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.INVALID_CREDENTIALS,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        record_audit_log(
            db,
            event_type="login_blocked_inactive",
            success=False,
            detail="Login attempted for deactivated account.",
            context=context,
            user_id=user.id,
            email=user.email,
        )
        raise AppAuthException(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=AuthErrorCode.ACCOUNT_INACTIVE,
            detail="This account has been deactivated. Please contact an administrator.",
        )

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    db.commit()
    db.refresh(user)

    record_audit_log(
        db,
        event_type="login_success",
        success=True,
        detail=f"Authenticated {user.role} session started.",
        context=context,
        user_id=user.id,
        email=user.email,
    )
    return user


def refresh_session(
    db: Session,
    *,
    refresh_token: str,
    settings: Settings,
    context: RequestContext,
) -> TokenResponse:
    """Validate and rotate a refresh token into a new access/refresh token pair."""
    decoded = decode_jwt_token(refresh_token, expected_type="refresh", settings=settings)

    if is_token_revoked(db, decoded.jti):
        record_audit_log(
            db,
            event_type="refresh_rejected_revoked",
            success=False,
            detail="Attempted refresh with a revoked token.",
            context=context,
            user_id=decoded.sub,
        )
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.TOKEN_REVOKED,
            detail="Refresh token has been revoked. Please sign in again.",
        )

    user = db.get(User, decoded.sub)
    if user is None:
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.INVALID_TOKEN,
            detail="User associated with token no longer exists.",
        )

    if not user.is_active:
        raise AppAuthException(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=AuthErrorCode.ACCOUNT_INACTIVE,
            detail="This account has been deactivated.",
        )

    _revoke_token_jti(
        db,
        jti=decoded.jti,
        token_type="refresh",
        user_id=user.id,
        expires_at=decoded.expires_at,
    )
    db.commit()
    purge_expired_revoked_tokens(db)

    record_audit_log(
        db,
        event_type="token_refresh",
        success=True,
        detail="Access and refresh tokens rotated.",
        context=context,
        user_id=user.id,
        email=user.email,
    )
    return issue_token_pair(user, settings)


def logout_session(
    db: Session,
    *,
    user: User,
    access_token_claims: DecodedToken,
    refresh_token: str | None,
    settings: Settings,
    context: RequestContext,
) -> int:
    """Revoke the current access token (and optional refresh token) to end the session."""
    revoked_count = 0
    if _revoke_token_jti(
        db,
        jti=access_token_claims.jti,
        token_type="access",
        user_id=user.id,
        expires_at=access_token_claims.expires_at,
    ):
        revoked_count += 1

    if refresh_token:
        try:
            refresh_claims = decode_jwt_token(
                refresh_token, expected_type="refresh", settings=settings
            )
            if refresh_claims.sub == user.id and _revoke_token_jti(
                db,
                jti=refresh_claims.jti,
                token_type="refresh",
                user_id=user.id,
                expires_at=refresh_claims.expires_at,
            ):
                revoked_count += 1
        except AppAuthException:
            # Ignore invalid/already-expired refresh token during logout so access revocation always succeeds.
            pass

    db.commit()
    purge_expired_revoked_tokens(db)

    record_audit_log(
        db,
        event_type="logout",
        success=True,
        detail=f"User logged out ({revoked_count} token(s) revoked).",
        context=context,
        user_id=user.id,
        email=user.email,
    )
    return revoked_count

