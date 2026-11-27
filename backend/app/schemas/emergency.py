"""Pydantic schemas for Module 4: Emergency Case Identification & Critical Triage."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class VitalSignsInput(BaseModel):
    """Vital signs and physiological measurements for acute clinical triage."""

    heart_rate: float | None = Field(
        default=None, ge=20, le=300, description="Pulse / Heart rate in beats per minute (bpm)"
    )
    systolic_bp: float | None = Field(
        default=None, ge=40, le=300, description="Systolic blood pressure in mmHg"
    )
    diastolic_bp: float | None = Field(
        default=None, ge=20, le=200, description="Diastolic blood pressure in mmHg"
    )
    respiratory_rate: float | None = Field(
        default=None, ge=4, le=80, description="Breaths per minute"
    )
    spo2: float | None = Field(
        default=None, ge=50, le=100, description="Blood oxygen saturation percentage (%)"
    )
    temperature: float | None = Field(
        default=None, ge=30.0, le=45.0, description="Body temperature in Celsius (°C)"
    )
    blood_glucose: float | None = Field(
        default=None, ge=20, le=800, description="Random/Fasting blood glucose in mg/dL"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "heart_rate": 118,
                "systolic_bp": 185,
                "diastolic_bp": 115,
                "respiratory_rate": 26,
                "spo2": 88.0,
                "temperature": 39.4,
                "blood_glucose": 240,
            }
        }
    )


class EmergencyRedFlag(BaseModel):
    """Specific clinical red-flag finding indicating life-threatening emergency."""

    flag_id: str = Field(description="Unique identifier of the red-flag syndrome")
    category: str = Field(description="Clinical domain (e.g. Cardiovascular, Neurological)")
    severity: str = Field(description="Severity classification: CRITICAL_EMERGENCY or URGENT_EVALUATION")
    title: str = Field(description="Concise clinician-facing title of the red-flag syndrome")
    matched_triggers: list[str] = Field(description="Patient symptoms or vitals that triggered this alert")
    clinical_rationale: str = Field(description="Pathophysiological risk explaining why this is life-threatening")
    action_required: str = Field(description="Immediate protocol or clinical maneuver required")


class EmergencyAssessmentRequest(BaseModel):
    """Request payload to evaluate patient emergency status and red-flag escalation."""

    symptoms: list[str] = Field(
        min_length=1,
        description="List of symptom names or codes reported by the patient",
    )
    vitals: VitalSignsInput | None = Field(
        default=None,
        description="Optional measured clinical vital signs",
    )
    patient_age: int | None = Field(
        default=None, ge=0, le=125, description="Patient age in years"
    )
    known_conditions: list[str] = Field(
        default_factory=list,
        description="Known pre-existing chronic conditions from medical history",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "symptoms": ["chest_pain", "breathlessness", "cold_sweats", "radiating_arm_pain"],
                "vitals": {
                    "heart_rate": 110,
                    "systolic_bp": 170,
                    "spo2": 93.0,
                },
                "patient_age": 58,
                "known_conditions": ["hypertension", "type_2_diabetes"],
            }
        }
    )


class EmergencyAssessmentResponse(BaseModel):
    """Comprehensive clinical triage assessment with actionable emergency escalation."""

    is_emergency: bool = Field(description="True if patient requires immediate emergency evaluation")
    urgency_tier: str = Field(
        description="Standard triage tier: CRITICAL_EMERGENCY, HIGH_URGENCY, MODERATE_PRIORITY, NON_EMERGENCY"
    )
    risk_score: float = Field(
        description="Composite health risk score from 0.0 (minimal) to 100.0 (maximum emergency)"
    )
    primary_emergency_category: str | None = Field(
        default=None, description="Dominant organ system / syndrome in emergency"
    )
    red_flags: list[EmergencyRedFlag] = Field(
        default_factory=list, description="List of detected acute life-threatening red flags"
    )
    vital_warnings: list[str] = Field(
        default_factory=list, description="Specific physiological vital sign thresholds exceeded"
    )
    immediate_actions: list[str] = Field(
        default_factory=list, description="Immediate first-aid and safety instructions for patient/caregiver"
    )
    triage_summary: str = Field(description="Clear clinical summary for emergency dispatch or ER triage nurse")
    emergency_hotlines: dict[str, str] = Field(
        description="Universal emergency phone numbers for ambulance and emergency services"
    )
    recommended_destination: str = Field(
        description="Level of care destination (e.g. Emergency Department, Urgent Care, Routine Outpatient)"
    )
    assessed_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 timestamp of triage assessment",
    )
