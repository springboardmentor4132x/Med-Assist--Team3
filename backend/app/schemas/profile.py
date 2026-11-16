
"""Schemas for user profile management."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ProfileResponse(BaseModel):
    """Safe profile information returned to the client."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ProfileUpdateRequest(BaseModel):
    """Only explicitly permitted profile fields can be updated."""

    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=120,
    )

    model_config = ConfigDict(extra="forbid")
