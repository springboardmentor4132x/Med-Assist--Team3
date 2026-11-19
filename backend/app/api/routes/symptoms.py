"""API routes for Module 2: Symptom Validation and Correlation Analysis."""

from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.data.symptoms_dataset import SYMPTOM_CATALOG
from sqlalchemy.orm import Session

from app.models import SymptomSubmission, User

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.symptoms import (
    IntegratedSymptomAssessmentResponse,
    SymptomAnalysisRequest,
    SymptomAnalysisResponse,
    SymptomCatalogItem,
    SymptomCategorySummary,
    SymptomValidationRequest,
    SymptomValidationResponse,
)
from app.services.symptom_service import (
    compute_symptom_correlations,
    create_integrated_symptom_assessment,
    get_patient_assessments_for_provider,
    get_user_symptom_assessments,
    validate_symptoms_input,
)


router = APIRouter(prefix="/symptoms", tags=["Symptom Analysis"])


@router.get(
    "",
    response_model=list[SymptomCatalogItem],
    summary="Get clinical symptoms catalog with search and category filters",
)
def get_symptoms_catalog(
    search: str | None = Query(default=None, description="Search by symptom name, code, or alias"),
    category: str | None = Query(default=None, description="Filter by anatomical body category"),
    is_red_flag: bool | None = Query(default=None, description="Filter for urgent red-flag symptoms"),
    limit: int = Query(default=100, ge=1, le=200, description="Maximum number of items to return"),
) -> list[SymptomCatalogItem]:
    """Return recognized clinical symptoms matching search query or category filters."""
    results: list[SymptomCatalogItem] = []
    norm_search = search.strip().lower() if search else None

    for meta in SYMPTOM_CATALOG.values():
        if category and meta.category.lower() != category.strip().lower():
            continue
        if is_red_flag is not None and meta.is_red_flag != is_red_flag:
            continue
        if norm_search:
            name_match = (
                  norm_search in meta.name.lower()
                  or norm_search in meta.id.lower()
                )
            alias_match = any(norm_search in alias.lower() for alias in meta.aliases)
            if not (name_match or alias_match):
                continue

        results.append(
            SymptomCatalogItem(
                id=meta.id,
                name=meta.name,
                category=meta.category,
                clinical_weight=meta.clinical_weight,
                is_red_flag=meta.is_red_flag,
                aliases=list(meta.aliases),
                description=meta.description,
            )
        )
        if len(results) >= limit:
            break

    return results


@router.get(
    "/categories",
    response_model=list[SymptomCategorySummary],
    summary="List anatomical body categories and symptom distribution",
)
def get_symptom_categories() -> list[SymptomCategorySummary]:
    """Return all anatomical categories with symptom counts and representative symptoms."""
    grouped: dict[str, list[str]] = defaultdict(list)
    for meta in SYMPTOM_CATALOG.values():
        grouped[meta.category].append(meta.name)

    summaries = [
        SymptomCategorySummary(
            category=cat,
            symptom_count=len(symptoms),
            sample_symptoms=symptoms[:4],
        )
        for cat, symptoms in sorted(grouped.items())
    ]
    return summaries


@router.post(
    "/validate",
    response_model=SymptomValidationResponse,
    summary="Validate and normalize user-entered symptoms",
)
def validate_symptoms(payload: SymptomValidationRequest) -> SymptomValidationResponse:
    """Validate submitted symptoms, normalize IDs and aliases, and check for clinical contradictions."""
    is_valid, validated, warnings, errors = validate_symptoms_input(payload.symptoms)

    return SymptomValidationResponse(
        is_valid=is_valid,
        total_submitted=len(payload.symptoms),
        validated_symptoms=validated,
        warnings=warnings,
        errors=errors,
    )


@router.post(
    "/analyze",
    response_model=SymptomAnalysisResponse,
    summary="Validate symptoms and execute correlation and cluster analysis",
)
def analyze_symptoms(payload: SymptomAnalysisRequest) -> SymptomAnalysisResponse:
    """Execute complete Module 2 analysis: clinical validation, correlation scoring,

    cluster coherence, and suggested co-occurring symptoms.
    """
    is_valid, validated, warnings, errors = validate_symptoms_input(payload.symptoms)

    if not is_valid or not validated:
        first_error = errors[0].message if errors else "Invalid symptom selection provided."
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=first_error,
        )

    (
        correlated_pairs,
        suggested_co_occurring,
        cluster_coherence,
        primary_systems,
        potential_categories,
    ) = compute_symptom_correlations(validated)

    red_flags = [s.name for s in validated if s.is_red_flag]

    return SymptomAnalysisResponse(
        validated_symptoms=validated,
        has_red_flags=len(red_flags) > 0,
        red_flag_symptoms=red_flags,
        cluster_coherence=cluster_coherence,
        top_correlated_pairs=correlated_pairs,
        suggested_co_occurring_symptoms=suggested_co_occurring,
        primary_affected_systems=primary_systems,
        potential_disease_categories=potential_categories,
    )

@router.post(
    "/submit",
    response_model=IntegratedSymptomAssessmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Validate, analyze, and integrate symptoms with the patient's medical history",
)
def submit_symptoms(
    payload: SymptomAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
) -> IntegratedSymptomAssessmentResponse:
    """Execute full Module 2 pipeline: validation, correlation analysis, and medical history integration."""
    return create_integrated_symptom_assessment(
        db=db,
        user_id=current_user.id,
        raw_items=payload.symptoms,
    )


@router.get(
    "/assessments/me",
    response_model=list[IntegratedSymptomAssessmentResponse],
    summary="Retrieve the logged-in patient's past integrated symptom assessments",
)
def get_my_symptom_assessments(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PATIENT)),
) -> list[IntegratedSymptomAssessmentResponse]:
    """Return past integrated symptom assessments for the authenticated patient."""
    return get_user_symptom_assessments(db=db, user_id=current_user.id, limit=limit)


@router.get(
    "/assessments/patient/{patient_id}",
    response_model=list[IntegratedSymptomAssessmentResponse],
    summary="Allow authorized providers/admins to inspect a patient's integrated assessments",
)
def get_patient_symptom_assessments(
    patient_id: int,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.DOCTOR, UserRole.CLINIC, UserRole.ADMIN)
    ),
) -> list[IntegratedSymptomAssessmentResponse]:
    """Read-only access to a patient's integrated symptom + medical history assessments."""
    return get_patient_assessments_for_provider(
        db=db, patient_id=patient_id, limit=limit
    )