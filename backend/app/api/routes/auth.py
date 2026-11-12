"""Authentication routes: registration, login, OAuth2 token, refresh, logout, and profile."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import (
    AuthenticatedSession,
    get_current_session,
    get_current_user,
    get_db,
    get_request_context,
)
from app.core.config import Settings, get_settings
from app.db.init_db import DEMO_ACCOUNTS
from app.models import AuthAuditLog, User
from app.schemas.auth import (
    AuditLogResponse,
    DemoAccountResponse,
    LoginRequest,
    LogoutRequest,
    LogoutResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import (
    RequestContext,
    authenticate_user,
    issue_token_pair,
    logout_session,
    refresh_session,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new Patient, Doctor, or Clinic user",
)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    context: RequestContext = Depends(get_request_context),
) -> TokenResponse:
    """Create a new user account and immediately issue JWT access & refresh tokens."""
    user = register_user(db, payload, settings, context)
    return issue_token_pair(user, settings)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user credentials and issue JWT tokens",
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    context: RequestContext = Depends(get_request_context),
) -> TokenResponse:
    """Verify email/password credentials and return JWT access + refresh tokens."""
    user = authenticate_user(
        db,
        email=payload.email,
        password=payload.password,
        settings=settings,
        context=context,
    )
    return issue_token_pair(user, settings)


@router.post(
    "/token",
    response_model=TokenResponse,
    summary="OAuth2 Password Flow token endpoint (for Swagger UI and OAuth2 clients)",
)
def login_oauth2_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    context: RequestContext = Depends(get_request_context),
) -> TokenResponse:
    """Authenticate using OAuth2 form-encoded `username` (email) and `password`."""
    user = authenticate_user(
        db,
        email=form_data.username,
        password=form_data.password,
        settings=settings,
        context=context,
    )
    return issue_token_pair(user, settings)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate refresh token and issue a fresh JWT pair",
)
def refresh_tokens(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    context: RequestContext = Depends(get_request_context),
) -> TokenResponse:
    """Validate a refresh token, revoke it, and return rotated JWT tokens."""
    return refresh_session(
        db,
        refresh_token=payload.refresh_token,
        settings=settings,
        context=context,
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Log out and revoke current JWT tokens",
)
def logout(
    payload: LogoutRequest | None = None,
    session: AuthenticatedSession = Depends(get_current_session),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    context: RequestContext = Depends(get_request_context),
) -> LogoutResponse:
    """Revoke the caller's access token and optional refresh token server-side."""
    revoked_count = logout_session(
        db,
        user=session.user,
        access_token_claims=session.token_claims,
        refresh_token=payload.refresh_token if payload else None,
        settings=settings,
        context=context,
    )
    return LogoutResponse(message="Successfully logged out.", revoked_tokens=revoked_count)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently authenticated user profile",
)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return profile metadata for the authenticated JWT bearer."""
    return UserResponse.model_validate(current_user)


@router.get(
    "/audit-logs",
    response_model=list[AuditLogResponse],
    summary="Get authentication activity logs for the signed-in user",
)
def get_my_audit_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditLogResponse]:
    """Return the most recent 25 authentication events for the current user."""
    rows = db.scalars(
        select(AuthAuditLog)
        .where(AuthAuditLog.user_id == current_user.id)
        .order_by(desc(AuthAuditLog.created_at), desc(AuthAuditLog.id))
        .limit(25)
    ).all()
    return [AuditLogResponse.model_validate(row) for row in rows]


@router.get(
    "/demo-accounts",
    response_model=list[DemoAccountResponse],
    summary="List seeded demo credentials (development environment only)",
)
def get_demo_accounts(
    settings: Settings = Depends(get_settings),
) -> list[DemoAccountResponse]:
    """Expose development-only demo accounts for local UI/API verification."""
    if settings.ENVIRONMENT != "development" or not settings.SEED_DEMO_USERS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo accounts endpoint is disabled outside development.",
        )
    return [DemoAccountResponse(**account) for account in DEMO_ACCOUNTS]

