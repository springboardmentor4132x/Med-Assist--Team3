"""API routes for Module 3: Disease Prediction and Probability Scoring."""

from fastapi import APIRouter, HTTPException, status

from app.schemas.disease_prediction import (
    DiseaseClassificationRequest,
    DiseaseClassificationResponse,
    DiseaseProbabilityResponse,
)
from app.services.disease_ml_service import (
    classify_patient_symptoms,
    predict_disease_probabilities,
)

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


@router.post(
    "/probabilities",
    response_model=DiseaseProbabilityResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate probability scores across candidate diseases",
    description="Takes reported symptoms and computes calibrated posterior probability distribution scores across clinical conditions.",
)
def get_disease_probabilities(payload: DiseaseClassificationRequest) -> DiseaseProbabilityResponse:
    if not payload.symptoms:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one symptom must be provided for probability score generation.",
        )

    try:
        result = predict_disease_probabilities(payload.symptoms)
        return DiseaseProbabilityResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Probability scoring error: {exc}",
        )
