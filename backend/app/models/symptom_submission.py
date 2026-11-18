"""Database model for storing user symptom selections and integrated assessments."""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SymptomSubmission(Base):
    """Stores symptoms, correlation analysis, and medical history context submitted by a user."""

    __tablename__ = "symptom_submissions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    medical_history_id: Mapped[int | None] = mapped_column(
        ForeignKey("medical_histories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    symptoms: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
    )

    correlation_summary: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    medical_history_context: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )