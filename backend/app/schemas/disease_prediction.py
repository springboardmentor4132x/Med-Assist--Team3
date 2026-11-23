"""Pydantic schemas for Module 3: Disease Prediction and Classification."""

from pydantic import BaseModel, Field


class DiseaseClassificationRequest(BaseModel):
    """Payload for submitting symptoms for disease classification."""

    symptoms: list[str] = Field(
        ...,
        min_length=1,
        description="List of symptom names or standardized IDs to classify (e.g. ['cough', 'high_fever']).",
        examples=[["polyuria", "polydipsia", "unexplained_weight_loss"]],
    )


class DiseaseClassificationResponse(BaseModel):
    """Response returned by the disease classification engine."""

    predicted_disease: str = Field(..., description="Machine-readable disease identifier.")
    display_name: str = Field(..., description="Full clinical title of the predicted disease.")
    category: str = Field(..., description="Anatomical or medical category (e.g., Respiratory, Endocrine).")
    icd10: str = Field(..., description="World Health Organization ICD-10 diagnostic code.")
    urgency_level: str = Field(..., description="Clinical triage urgency: low, moderate, high, or emergency.")
    description: str = Field(..., description="Pathophysiological overview of the condition.")
    matched_symptoms: list[str] = Field(..., description="Patient symptoms that directly match this disease profile.")
    primary_symptoms_matched: list[str] = Field(..., description="Hallmark primary symptoms present in patient profile.")
    total_symptoms_evaluated: int = Field(..., description="Total count of symptoms analyzed.")
    match_ratio: float = Field(..., description="Proportion of patient symptoms aligned with this condition.")
