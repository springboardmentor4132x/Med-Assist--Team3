"""API endpoints for Module 4: Emergency Case Identification & Critical Triage."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException, status

from app.schemas.emergency import (
    EmergencyAssessmentRequest,
    EmergencyAssessmentResponse,
)
from app.services.emergency_service import (
    DEFAULT_EMERGENCY_HOTLINES,
    assess_patient_emergency,
)

router = APIRouter(prefix="/emergency", tags=["Emergency Triage"])


@router.post(
    "/evaluate",
    response_model=EmergencyAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate patient symptoms and vitals for emergency red flags",
    description=(
        "Executes algorithmic clinical emergency assessment. Detects acute syndromes "
        "(Acute Coronary Syndrome, FAST Stroke, Anaphylaxis, Sepsis, Critical Hypoxemia, Hemorrhage) "
        "and produces immediate emergency dispatch advice, hotlines, and first-aid instructions."
    ),
)
def evaluate_emergency(
    payload: EmergencyAssessmentRequest,
) -> EmergencyAssessmentResponse:
    if not payload.symptoms:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one symptom must be provided to run emergency triage assessment.",
        )

    try:
        return assess_patient_emergency(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Emergency assessment engine encountered an error: {exc}",
        )


@router.get(
    "/red-flags",
    summary="Retrieve catalog of critical clinical emergency warning indicators",
    description="Returns recognized life-threatening red-flag syndromes and universal emergency contact numbers.",
)
def get_emergency_catalog() -> dict[str, Any]:
    return {
        "emergency_hotlines": DEFAULT_EMERGENCY_HOTLINES,
        "critical_syndromes": [
            {
                "id": "CARD_ACS_INFARCTION",
                "name": "Acute Coronary Syndrome / Heart Attack",
                "key_symptoms": ["chest pain", "pain radiating to left arm/jaw", "shortness of breath", "cold sweats"],
                "protocol": "Immediate 112/911 call, chew aspirin 300mg, rest semi-upright, do not drive.",
            },
            {
                "id": "NEURO_ACUTE_STROKE",
                "name": "Acute Stroke (FAST Protocol)",
                "key_symptoms": ["facial droop", "slurred speech / inability to speak", "one-sided arm/leg weakness"],
                "protocol": "Note time of onset, call emergency services immediately, zero oral intake.",
            },
            {
                "id": "IMMUNO_ANAPHYLAXIS",
                "name": "Acute Anaphylaxis / Severe Allergy",
                "key_symptoms": ["swollen lips/tongue/throat", "hives/generalized rash", "difficulty breathing", "dizziness"],
                "protocol": "Immediate Epipen injection into outer thigh, lie flat with legs elevated, emergency hospital transport.",
            },
            {
                "id": "RESP_CRITICAL_DISTRESS",
                "name": "Severe Respiratory Failure / Hypoxia",
                "key_symptoms": ["bluish lips/skin (cyanosis)", "stridor", "coughing blood", "SpO2 < 90%"],
                "protocol": "Sit upright, immediate oxygen support, emergency room admission.",
            },
            {
                "id": "INFECT_SEVERE_SEPSIS",
                "name": "Severe Sepsis / Septic Shock",
                "key_symptoms": ["high fever / extreme shivering", "confusion / altered sensorium", "rapid heart rate", "breathlessness"],
                "protocol": "Urgent IV antibiotics and fluid resuscitation within 1 hour.",
            },
            {
                "id": "GI_ACUTE_HEMORRHAGE",
                "name": "Acute Internal Hemorrhage / Acute Abdomen",
                "key_symptoms": ["vomiting blood", "black tarry stools", "rigid board-like abdomen"],
                "protocol": "Nil per os (no food/drinks), urgent surgical/endoscopic evaluation.",
            },
        ],
    }
