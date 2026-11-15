"""SQLAlchemy engine and session factory supporting PostgreSQL and local SQLite."""

from datetime import UTC, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""


def ensure_utc(dt: datetime | None) -> datetime | None:
    """Normalize naive datetimes returned by SQLite into timezone-aware UTC datetimes."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def create_db_engine(database_url: str | None = None):
    """Create a configured SQLAlchemy engine for PostgreSQL or SQLite."""
    url = database_url or get_settings().DATABASE_URL
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

