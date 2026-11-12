"""Shared FastAPI dependencies for DB sessions, JWT validation, and RBAC."""

from collections.abc import Callable, Generator
from dataclasses import dataclass

from fastapi import Depends, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.exceptions import AppAuthException, AuthErrorCode
from app.core.security import DecodedToken, decode_jwt_token
from app.db.session import SessionLocal
from app.models import User, UserRole
from app.services.auth_service import RequestContext, is_token_revoked

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


@dataclass(frozen=True)
class AuthenticatedSession:
    """Verified user entity paired with its decoded JWT claims."""

    user: User
    token_claims: DecodedToken


def get_db() -> Generator[Session, None, None]:
    """Yield a scoped SQLAlchemy session and close it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_request_context(request: Request) -> RequestContext:
    """Extract client IP and User-Agent metadata for rate limiting and audit logs."""
    forwarded_for = request.headers.get("x-forwarded-for")
    client_ip = (
        forwarded_for.split(",")[0].strip()
        if forwarded_for
        else (request.client.host if request.client else None)
    )
    return RequestContext(
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent"),
    )


def _extract_bearer_token(request: Request, oauth_token: str | None) -> str:
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.MISSING_CREDENTIALS,
            detail="Authentication credentials were not provided.",
        )

    scheme, _, credentials = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not credentials.strip():
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.INVALID_AUTH_HEADER,
            detail="Authorization header must be in 'Bearer <token>' format.",
        )

    return oauth_token or credentials.strip()


def get_current_session(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedSession:
    """Validate the Bearer JWT, check revocation status, and return active user + claims."""
    raw_token = _extract_bearer_token(request, token)
    decoded = decode_jwt_token(raw_token, expected_type="access", settings=settings)

    if is_token_revoked(db, decoded.jti):
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.TOKEN_REVOKED,
            detail="This session has been logged out or revoked. Please sign in again.",
        )

    user = db.get(User, decoded.sub)
    if user is None:
        raise AppAuthException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=AuthErrorCode.INVALID_TOKEN,
            detail="Authenticated user account could not be found.",
        )

    if not user.is_active:
        raise AppAuthException(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=AuthErrorCode.ACCOUNT_INACTIVE,
            detail="This account is deactivated.",
        )

    return AuthenticatedSession(user=user, token_claims=decoded)


def get_current_user(
    session: AuthenticatedSession = Depends(get_current_session),
) -> User:
    """Return the authenticated active User for protected endpoints."""
    return session.user


def require_roles(*allowed_roles: UserRole) -> Callable[[User], User]:
    """Build an RBAC dependency enforcing that `current_user.role` is permitted."""
    allowed_values = {role.value for role in allowed_roles}
    sorted_names = ", ".join(sorted(allowed_values))

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_values:
            raise AppAuthException(
                status_code=status.HTTP_403_FORBIDDEN,
                error_code=AuthErrorCode.INSUFFICIENT_PERMISSIONS,
                detail=f"Role '{current_user.role}' is not authorized for this resource (requires: {sorted_names}).",
            )
        return current_user

    return role_checker

