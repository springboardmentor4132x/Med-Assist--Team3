"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DEV_JWT_SECRET = "dev-only-medassist-ai-jwt-secret-key-change-in-prod-2026"


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables or `.env`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "MedAssist AI Authentication Service"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "test", "production"] = "development"
    DEBUG: bool = True

    DATABASE_URL: str = "sqlite:///./medassist_auth.db"

    JWT_SECRET_KEY: str = DEFAULT_DEV_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15
    LOGIN_RATE_LIMIT_MAX_REQUESTS: int = 20
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = 60

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    SEED_DEMO_USERS: bool = True

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        """Support comma-separated CORS origins in environment files."""
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    def validate_security(self) -> None:
        """Reject insecure defaults when running in production."""
        if self.ENVIRONMENT != "production":
            return
        if self.JWT_SECRET_KEY == DEFAULT_DEV_JWT_SECRET or len(self.JWT_SECRET_KEY) < 32:
            raise RuntimeError(
                "JWT_SECRET_KEY must be explicitly set to at least 32 characters in production."
            )
        if self.SEED_DEMO_USERS:
            raise RuntimeError("SEED_DEMO_USERS must be disabled in production.")


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()

