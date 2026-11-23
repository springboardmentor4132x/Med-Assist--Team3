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


class DiseaseProbabilityItem(BaseModel):
    """Individual disease candidate with calibrated posterior probability score."""

    disease: str = Field(..., description="Machine-readable disease identifier.")
    display_name: str = Field(..., description="Clinical disease title.")
    category: str = Field(..., description="Clinical specialty or organ category.")
    icd10: str = Field(..., description="ICD-10 classification code.")
    urgency_level: str = Field(..., description="Urgency rating (low, moderate, high, emergency).")
    probability: float = Field(..., description="Calibrated probability float between 0.0 and 1.0.")
    probability_percent: float = Field(..., description="Probability expressed as a percentage (0.0% - 100.0%).")
    matched_symptoms: list[str] = Field(..., description="Patient symptoms that match this disease profile.")
    primary_symptoms_matched: list[str] = Field(..., description="Key hallmark symptoms present.")


class DiseaseProbabilityResponse(BaseModel):
    """Comprehensive probability distribution response for differential diagnosis scoring."""

    top_prediction: DiseaseProbabilityItem = Field(..., description="Disease candidate with the highest likelihood score.")
    probabilities: list[DiseaseProbabilityItem] = Field(
        ..., description="Ranked list of top candidate diseases sorted descending by probability."
    )
    total_conditions_evaluated: int = Field(..., description="Total number of clinical conditions evaluated.")
    evaluated_symptoms: list[str] = Field(..., description="Standardized patient symptoms processed.")
    dominant_category: str = Field(..., description="Most prevalent medical category among top candidates.")


class DifferentialCandidate(BaseModel):
    """A ranked condition in the differential diagnosis evaluation (Module 3 Component 3)."""

    rank: int = Field(..., description="Rank order by probability likelihood (1-based index).")
    disease: str = Field(..., description="Machine-readable disease identifier.")
    display_name: str = Field(..., description="Full clinical title.")
    category: str = Field(..., description="Medical or organ category.")
    icd10: str = Field(..., description="ICD-10 classification code.")
    urgency_level: str = Field(..., description="Urgency rating (low, moderate, high, emergency).")
    probability: float = Field(..., description="Calibrated probability float.")
    probability_percent: float = Field(..., description="Probability expressed as a percentage.")
    matched_symptoms: list[str] = Field(..., description="Patient symptoms matching this diagnosis.")
    missing_hallmark_symptoms: list[str] = Field(
        ..., description="Key hallmark symptoms expected for this disease not reported by the patient."
    )
    clinical_rationale: str = Field(..., description="Evidence rationale explaining why this diagnosis was ranked.")
    recommended_diagnostic_tests: list[str] = Field(
        ..., description="Standard clinical lab tests or imaging recommended to confirm or rule out."
    )


class DifferentialDiagnosisResponse(BaseModel):
    """Response returned for multi-disease differential diagnosis prediction."""

    query_symptoms: list[str] = Field(..., description="Patient symptoms evaluated.")
    candidates: list[DifferentialCandidate] = Field(
        ..., description="Ranked differential diagnosis candidates with comparative clinical evidence."
    )
    highest_urgency: str = Field(..., description="Highest urgency among all plausible candidates.")
    total_candidates: int = Field(..., description="Number of differential candidates returned.")
    clinical_triage_guidance: str = Field(
        ..., description="Clinical triage advice based on urgency and symptom constellation."
    )


class PredictionConfidenceDetails(BaseModel):
    """Calibrated prediction confidence scoring metric (Module 3 Component 4)."""

    confidence_score: float = Field(..., description="Normalized confidence coefficient between 0.0 and 1.0.")
    confidence_percent: float = Field(..., description="Confidence expressed as a percentage (0.0% - 100.0%).")
    confidence_level: str = Field(..., description="Categorical confidence tier: High, Moderate, or Low.")
    margin_of_separation: float = Field(
        ..., description="Likelihood difference between primary prediction and nearest differential alternative."
    )
    symptom_coverage: float = Field(
        ..., description="Proportion of patient symptoms directly explained by the primary disease profile."
    )
    hallmark_symptoms_present: int = Field(
        ..., description="Count of primary hallmark symptoms validated in patient presentation."
    )
    ambiguity_flag: bool = Field(
        ..., description="True if top candidate margin is narrow, indicating close competing differentials."
    )
    clinical_recommendation: str = Field(
        ..., description="Evidence-backed clinical workflow recommendation based on confidence tier."
    )


class ComprehensivePredictionResponse(BaseModel):
    """Unified disease prediction payload consolidating all 4 Module 3 components."""

    classification: DiseaseClassificationResponse = Field(..., description="Component 1: Primary disease classification.")
    probabilities: list[DiseaseProbabilityItem] = Field(..., description="Component 2: Posterior probability scores.")
    differential_diagnoses: list[DifferentialCandidate] = Field(
        ..., description="Component 3: Ranked differential candidates."
    )
    confidence: PredictionConfidenceDetails = Field(..., description="Component 4: Prediction confidence scoring.")
    triage_urgency: str = Field(..., description="Overall triage urgency level.")
    clinical_summary: str = Field(..., description="Clinical executive summary synthesizing all diagnostic evidence.")
