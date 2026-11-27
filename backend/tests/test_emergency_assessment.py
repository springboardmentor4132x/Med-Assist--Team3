"""Automated test suite for Module 4: Emergency Case Identification & Triage."""

import pytest
from fastapi import HTTPException

from app.api.routes.emergency import evaluate_emergency, get_emergency_catalog
from app.schemas.emergency import EmergencyAssessmentRequest, VitalSignsInput
from app.services.emergency_service import assess_patient_emergency


def test_service_cardiac_acs_emergency() -> None:
    req = EmergencyAssessmentRequest(
        symptoms=["chest_pain", "radiating_arm_pain", "cold_sweats"],
        vitals=VitalSignsInput(heart_rate=115, systolic_bp=150, spo2=93.0),
    )
    res = assess_patient_emergency(req)
    assert res.is_emergency is True
    assert res.urgency_tier == "CRITICAL_EMERGENCY"
    assert res.risk_score >= 50.0
    flag_ids = [f.flag_id for f in res.red_flags]
    assert "CARD_ACS_INFARCTION" in flag_ids
    assert len(res.immediate_actions) > 0


def test_service_stroke_fast_protocol() -> None:
    req = EmergencyAssessmentRequest(
        symptoms=["facial_droop", "slurred_speech", "weakness_of_one_body_side"],
        patient_age=68,
    )
    res = assess_patient_emergency(req)
    assert res.is_emergency is True
    assert res.urgency_tier == "CRITICAL_EMERGENCY"
    flag_ids = [f.flag_id for f in res.red_flags]
    assert "NEURO_ACUTE_STROKE" in flag_ids
    actions_str = " ".join(res.immediate_actions)
    assert "food" in actions_str.lower() or "aspirin" in actions_str.lower() or "ambulance" in actions_str.lower()


def test_service_anaphylaxis_shock() -> None:
    req = EmergencyAssessmentRequest(
        symptoms=["swollen tongue", "hives", "difficulty breathing"],
    )
    res = assess_patient_emergency(req)
    assert res.is_emergency is True
    flag_ids = [f.flag_id for f in res.red_flags]
    assert "IMMUNO_ANAPHYLAXIS" in flag_ids
    actions_str = " ".join(res.immediate_actions)
    assert "epipen" in actions_str.lower() or "epinephrine" in actions_str.lower()


def test_service_critical_vitals_hypoxia() -> None:
    req = EmergencyAssessmentRequest(
        symptoms=["dry cough"],
        vitals=VitalSignsInput(spo2=86.0),
    )
    res = assess_patient_emergency(req)
    assert res.is_emergency is True
    flag_ids = [f.flag_id for f in res.red_flags]
    assert "VITAL_CRITICAL_HYPOXIA" in flag_ids
    assert len(res.vital_warnings) >= 1


def test_service_hypertensive_crisis() -> None:
    req = EmergencyAssessmentRequest(
        symptoms=["headache"],
        vitals=VitalSignsInput(systolic_bp=195, diastolic_bp=125),
    )
    res = assess_patient_emergency(req)
    assert res.is_emergency is True
    flag_ids = [f.flag_id for f in res.red_flags]
    assert "VITAL_HYPERTENSIVE_CRISIS" in flag_ids


def test_service_routine_non_emergency() -> None:
    req = EmergencyAssessmentRequest(
        symptoms=["mild fatigue", "sneezing", "runny nose"],
        vitals=VitalSignsInput(heart_rate=72, systolic_bp=118, diastolic_bp=78, spo2=98.0, temperature=36.8),
    )
    res = assess_patient_emergency(req)
    assert res.is_emergency is False
    assert res.urgency_tier in ["NON_EMERGENCY", "MODERATE_PRIORITY"]
    assert len(res.red_flags) == 0
    assert res.risk_score < 40.0


def test_endpoint_emergency_evaluate_handler() -> None:
    payload = EmergencyAssessmentRequest(
        symptoms=["chest_pain", "radiating_arm_pain", "cold_sweats"],
        vitals=VitalSignsInput(heart_rate=110, spo2=93.0),
    )
    res = evaluate_emergency(payload)
    assert res.is_emergency is True
    assert res.urgency_tier == "CRITICAL_EMERGENCY"
    assert res.risk_score >= 50.0
    assert "112" in str(res.emergency_hotlines) or "911" in str(res.emergency_hotlines)


def test_endpoint_emergency_empty_symptoms_raises_422() -> None:
    payload = EmergencyAssessmentRequest(symptoms=["fever"])
    # Empty list triggers HTTPException 422
    payload.symptoms = []
    with pytest.raises(HTTPException) as exc_info:
        evaluate_emergency(payload)
    assert exc_info.value.status_code == 422


def test_endpoint_emergency_red_flags_catalog() -> None:
    data = get_emergency_catalog()
    assert "emergency_hotlines" in data
    assert "critical_syndromes" in data
    assert len(data["critical_syndromes"]) >= 5
