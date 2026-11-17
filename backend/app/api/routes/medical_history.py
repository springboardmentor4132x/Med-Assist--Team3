"""Medical history tracking endpoints with role-based access control."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.medical_history import (
    MedicalHistoryResponse,
    MedicalHistoryUpdateRequest,
)
from app.services.medical_history_service import (
    get_or_initialize_history,
    get_patient_history_for_provider,
    upsert_patient_history,
)

router = APIRouter(prefix="/medical-history", tags=["Medical History"])


@router.get("/me", response_model=MedicalHistoryResponse)
def get_my_medical_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
):
    """Retrieve the authenticated patient's own medical history."""
    return get_or_initialize_history(db, current_user.id)


@router.put("/me", response_model=MedicalHistoryResponse)
def update_my_medical_history(
    payload: MedicalHistoryUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
):
    """Create or update the authenticated patient's own medical history."""
    return upsert_patient_history(db, current_user.id, payload)


@router.get("/patient/{patient_id}", response_model=MedicalHistoryResponse)
def get_patient_medical_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.DOCTOR, UserRole.CLINIC, UserRole.ADMIN)
    ),
):
    """Allow authorized healthcare providers and admins to view a patient's history."""
    return get_patient_history_for_provider(db, patient_id)