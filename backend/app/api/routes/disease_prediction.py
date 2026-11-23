"""API routes for Module 3: Disease Prediction (Component 1: Disease Classification)."""

from fastapi import APIRouter, HTTPException, status

from app.schemas.disease_prediction import (
    DiseaseClassificationRequest,
    DiseaseClassificationResponse,
)
from app.services.disease_ml_service import classify_patient_symptoms

router = APIRouter(prefix="/predictions", tags=["Disease Prediction"])


@router.post(
    "/classify",
    response_model=DiseaseClassificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Classify patient symptoms into the most likely clinical disease",
    description="Takes a list of reported symptoms and runs multi-class machine learning disease classification.",
)
def classify_disease(payload: DiseaseClassificationRequest) -> DiseaseClassificationResponse:
    if not payload.symptoms:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one symptom must be provided for disease classification.",
        )

    try:
        result = classify_patient_symptoms(payload.symptoms)
        return DiseaseClassificationResponse(**result.to_dict())
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification engine error: {exc}",
        )
