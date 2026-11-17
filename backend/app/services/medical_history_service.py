"""Business logic for creating, retrieving, and updating medical histories."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.medical_history import MedicalHistory
from app.models.user import User, UserRole
from app.schemas.medical_history import MedicalHistoryUpdateRequest


def get_or_initialize_history(db: Session, user_id: int) -> MedicalHistory:
    """Fetch a patient's medical history, creating an empty record if none exists yet."""
    stmt = select(MedicalHistory).where(MedicalHistory.user_id == user_id)
    history = db.execute(stmt).scalar_one_or_none()

    if history is None:
        history = MedicalHistory(user_id=user_id)
        db.add(history)
        db.commit()
        db.refresh(history)

    return history


def upsert_patient_history(
    db: Session,
    user_id: int,
    payload: MedicalHistoryUpdateRequest,
) -> MedicalHistory:
    """Create or partially update a patient's medical history."""
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one medical history field to update.",
        )

    history = get_or_initialize_history(db, user_id)

    for field, value in updates.items():
        if value is None and field != "blood_group":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field} cannot be null.",
            )
        setattr(history, field, value)

    db.add(history)
    db.commit()
    db.refresh(history)
    return history


def get_patient_history_for_provider(db: Session, patient_id: int) -> MedicalHistory:
    """Retrieve a specific patient's history for authorized doctors, clinics, or admins."""
    patient = db.get(User, patient_id)
    if patient is None or patient.role != UserRole.PATIENT.value:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found.",
        )

    return get_or_initialize_history(db, patient_id)