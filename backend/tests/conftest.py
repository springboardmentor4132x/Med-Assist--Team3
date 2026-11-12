"""Pytest fixtures providing an isolated SQLite database and FastAPI TestClient."""

from collections.abc import Generator
from pathlib import Path

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import get_db
from app.core.config import Settings, get_settings
from app.core.rate_limiter import rate_limiter
from app.db.init_db import seed_demo_users
from app.db.session import Base
from app.main import create_app


@pytest.fixture
def test_settings() -> Settings:
    """Return isolated test settings with strict lockout and clean rate limits."""
    return Settings(
        ENVIRONMENT="test",
        DEBUG=True,
        DATABASE_URL="sqlite:///:memory:",
        JWT_SECRET_KEY="test-jwt-secret-key-at-least-32-chars-long-2026",
        ACCESS_TOKEN_EXPIRE_MINUTES=30,
        REFRESH_TOKEN_EXPIRE_DAYS=7,
        MAX_FAILED_LOGIN_ATTEMPTS=3,
        ACCOUNT_LOCKOUT_MINUTES=15,
        LOGIN_RATE_LIMIT_MAX_REQUESTS=10,
        LOGIN_RATE_LIMIT_WINDOW_SECONDS=60,
        SEED_DEMO_USERS=False,
    )


@pytest.fixture
def db_session(tmp_path: Path) -> Generator[Session, None, None]:
    """Create a fresh SQLite test database per test case."""
    db_file = tmp_path / "test_auth.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as seed_db:
        seed_demo_users(seed_db)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def client(db_session: Session, test_settings: Settings) -> Generator[TestClient, None, None]:
    """Return a FastAPI TestClient wired to the isolated test DB and settings."""
    rate_limiter.reset()
    app = create_app(custom_settings=test_settings, init_db_on_startup=False)

    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = lambda: test_settings

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    rate_limiter.reset()

