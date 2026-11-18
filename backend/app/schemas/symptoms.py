"""Pydantic schemas for Module 2: Symptom Validation and Correlation Analysis."""

from datetime import datetime, timezone
from typing import Literal, Any
from uuid import uuid4
from app.schemas.medical_history import LifestyleFactors, MedicationItem, SurgeryItem
from pydantic import BaseModel, ConfigDict, Field, field_validator

SymptomSeverity = Literal["mild", "moderate", "severe"]
ClusterCoherence = Literal["high", "moderate", "low"]


class SymptomItem(BaseModel):
    """User input representing a selected or reported symptom."""

    symptom_id: str = Field(..., min_length=1, max_length=100, description="Normalized symptom code or name")
    severity: SymptomSeverity = Field(default="moderate", description="Subjective intensity level")
    duration_days: int = Field(default=1, ge=1, le=365, description="Duration in days (1 - 365)")

    @field_validator("symptom_id")
    @classmethod
    def clean_symptom_id(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned:
            raise ValueError("symptom_id must not be empty.")
        return cleaned


class ValidatedSymptom(BaseModel):
    """Validated, normalized clinical symptom record."""

    symptom_id: str
    name: str
    category: str
    severity: SymptomSeverity
    duration_days: int
    clinical_weight: int
    is_red_flag: bool
    description: str


class ValidationIssue(BaseModel):
    """Warning or non-blocking feedback during clinical validation."""

    code: str
    message: str
    symptom_id: str | None = None


class SymptomValidationRequest(BaseModel):
    """Payload to validate a list of user-entered symptoms."""

    symptoms: list[SymptomItem] = Field(..., min_length=1, max_length=30)


class SymptomValidationResponse(BaseModel):
    """Detailed result of clinical validation checks."""

    is_valid: bool
    total_submitted: int
    validated_symptoms: list[ValidatedSymptom]
    warnings: list[ValidationIssue]
    errors: list[ValidationIssue]


class SymptomCorrelationItem(BaseModel):
    """Pairwise correlation metrics between two validated symptoms."""

    symptom_a: str
    symptom_b: str
    correlation_score: float = Field(..., ge=0.0, le=1.0)
    co_occurrence_count: int
    clinical_relevance: str


class SuggestedSymptom(BaseModel):
    """A highly correlated symptom that the user hasn't selected yet."""

    symptom_id: str
    name: str
    category: str
    correlation_score: float = Field(..., ge=0.0, le=1.0)
    reason: str


class SymptomAnalysisRequest(BaseModel):
    """Payload to validate symptoms and perform cluster correlation analysis."""

    symptoms: list[SymptomItem] = Field(..., min_length=1, max_length=30)
    patient_id: int | None = Field(default=None, description="Optional patient ID if linking records")


class SymptomAnalysisResponse(BaseModel):
    """Comprehensive correlation and cluster analysis output for Module 2."""

    session_id: str = Field(default_factory=lambda: uuid4().hex)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    validated_symptoms: list[ValidatedSymptom]
    has_red_flags: bool
    red_flag_symptoms: list[str]
    cluster_coherence: ClusterCoherence
    top_correlated_pairs: list[SymptomCorrelationItem]
    suggested_co_occurring_symptoms: list[SuggestedSymptom]
    primary_affected_systems: list[str]
    potential_disease_categories: list[str]


class SymptomCatalogItem(BaseModel):
    """Catalog entry describing a known recognized symptom."""

    id: str
    name: str
    category: str
    clinical_weight: int
    is_red_flag: bool
    aliases: list[str]
    description: str


class SymptomCategorySummary(BaseModel):
    """Overview of a body system category and its available symptom count."""

    category: str
    symptom_count: int
    sample_symptoms: list[str]
    
class MedicalHistoryContext(BaseModel):
    """Point-in-time baseline medical history and longitudinal context for Module 2 & 3."""

    medical_history_id: int
    blood_group: str | None = None
    chronic_conditions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    current_medications: list[MedicationItem] = Field(default_factory=list)
    past_surgeries: list[SurgeryItem] = Field(default_factory=list)
    family_history: list[str] = Field(default_factory=list)
    lifestyle_factors: LifestyleFactors = Field(default_factory=LifestyleFactors)
    previous_assessments_count: int = 0
    history_last_updated_at: datetime | None = None


class IntegratedSymptomAssessmentResponse(BaseModel):
    """Complete Module 2 output combining validated symptoms, correlations, and medical history."""

    model_config = ConfigDict(from_attributes=True)

    assessment_id: int
    user_id: int
    created_at: datetime
    validated_symptoms: list[ValidatedSymptom]
    warnings: list[ValidationIssue] = Field(default_factory=list)
    has_red_flags: bool
    red_flag_symptoms: list[str]
    cluster_coherence: ClusterCoherence
    top_correlated_pairs: list[SymptomCorrelationItem]
    suggested_co_occurring_symptoms: list[SuggestedSymptom]
    primary_affected_systems: list[str]
    potential_disease_categories: list[str]
    medical_history_context: MedicalHistoryContext
