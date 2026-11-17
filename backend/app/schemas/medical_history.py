"""Pydantic schemas for patient medical history tracking."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MedicationItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    dosage: str | None = Field(default=None, max_length=60)
    frequency: str | None = Field(default=None, max_length=60)


class SurgeryItem(BaseModel):
    procedure: str = Field(..., min_length=1, max_length=150)
    year: int | None = Field(default=None, ge=1900, le=2100)
    notes: str | None = Field(default=None, max_length=255)


class LifestyleFactors(BaseModel):
    smoking_status: Literal["never", "former", "current"] | None = None
    alcohol_consumption: Literal["none", "occasional", "moderate", "heavy"] | None = None
    physical_activity: Literal["sedentary", "light", "moderate", "active"] | None = None


class MedicalHistoryUpdateRequest(BaseModel):
    """Payload for creating or updating a patient's medical history."""

    blood_group: str | None = Field(default=None, max_length=10)
    chronic_conditions: list[str] | None = None
    allergies: list[str] | None = None
    current_medications: list[MedicationItem] | None = None
    past_surgeries: list[SurgeryItem] | None = None
    family_history: list[str] | None = None
    lifestyle_factors: LifestyleFactors | None = None


class MedicalHistoryResponse(BaseModel):
    """Serialized medical history returned by API endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    blood_group: str | None = None
    chronic_conditions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    current_medications: list[MedicationItem] = Field(default_factory=list)
    past_surgeries: list[SurgeryItem] = Field(default_factory=list)
    family_history: list[str] = Field(default_factory=list)
    lifestyle_factors: LifestyleFactors = Field(default_factory=LifestyleFactors)
    created_at: datetime
    updated_at: datetime