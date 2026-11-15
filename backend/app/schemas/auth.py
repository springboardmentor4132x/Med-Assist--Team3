"""Authentication, user profile, audit log, and protected resource schemas."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.security import validate_password_strength
from app.models.user import UserRole


class RegisterRequest(BaseModel):
    """Payload for registering a new MedAssist AI account."""

    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    role: UserRole = UserRole.PATIENT

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        """Trim surrounding whitespace and reject blank names."""
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Full name must be at least 2 characters.")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        """Normalize emails to lowercase for consistent lookup."""
        return str(value).strip().lower()

    @field_validator("password")
    @classmethod
    def check_password_policy(cls, value: str) -> str:
        """Validate password complexity requirements."""
        return validate_password_strength(value)


class LoginRequest(BaseModel):
    """JSON payload for email/password login."""

    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        """Normalize emails to lowercase before lookup."""
        return str(value).strip().lower()


class RefreshRequest(BaseModel):
    """Payload for rotating a refresh token."""

    refresh_token: str = Field(..., min_length=1)


class LogoutRequest(BaseModel):
    """Optional payload allowing logout to revoke the refresh token as well."""

    refresh_token: str | None = None


class UserResponse(BaseModel):
    """Safe representation of an authenticated user (never includes password hash)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime


class TokenResponse(BaseModel):
    """JWT access and refresh token bundle returned on login/registration/refresh."""

    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserResponse


class LogoutResponse(BaseModel):
    """Confirmation returned after server-side token revocation."""

    message: str
    revoked_tokens: int


class AuditLogResponse(BaseModel):
    """Authentication audit log item."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    email: str | None
    event_type: str
    success: bool
    detail: str
    ip_address: str | None
    created_at: datetime


class DemoAccountResponse(BaseModel):
    """Development-only demo login credentials descriptor."""

    role: str
    email: EmailStr
    password: str
    full_name: str


class ProtectedResourceResponse(BaseModel):
    """Standard payload returned by protected RBAC routes."""

    message: str
    module: str
    role: str
    user: UserResponse
    allowed_actions: list[str]
    data: dict[str, Any]

