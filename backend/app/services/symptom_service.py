"""Service implementing clinical symptom validation and correlation analysis (Module 2, Tasks 2 & 3)."""

from collections import Counter, defaultdict
import re
from typing import Any

from app.data.symptoms_dataset import CLINICAL_DISEASE_PROFILES, SYMPTOM_CATALOG, SymptomMetadata
from app.schemas.symptoms import (
    ClusterCoherence,
    SuggestedSymptom,
    SymptomCorrelationItem,
    SymptomItem,
    ValidatedSymptom,
    ValidationIssue,
)


def _clean_string(text: str) -> str:
    """Normalize string for lookup: lowercase, replace spaces/hyphens with single underscore."""
    text = text.strip().lower()
    text = re.sub(r"[\s\-_]+", "_", text)
    return text.strip("_")


# Precompute alias lookup index
_ALIAS_INDEX: dict[str, str] = {}
for sym_id, meta in SYMPTOM_CATALOG.items():
    _ALIAS_INDEX[_clean_string(sym_id)] = sym_id
    _ALIAS_INDEX[_clean_string(meta.name)] = sym_id
    for alias in meta.aliases:
        _ALIAS_INDEX[_clean_string(alias)] = sym_id


def resolve_symptom(input_str: str) -> SymptomMetadata | None:
    """Resolve raw user symptom string against catalog IDs, names, and aliases."""
    cleaned = _clean_string(input_str)
    if cleaned in _ALIAS_INDEX:
        target_id = _ALIAS_INDEX[cleaned]
        return SYMPTOM_CATALOG.get(target_id)
    return None


def validate_symptoms_input(
    raw_items: list[SymptomItem],
) -> tuple[bool, list[ValidatedSymptom], list[ValidationIssue], list[ValidationIssue]]:
    """Validate, deduplicate, and normalize a list of user-entered symptoms.

    Returns: (is_valid, validated_symptoms, warnings, errors)
    """
    errors: list[ValidationIssue] = []
    warnings: list[ValidationIssue] = []
    validated: list[ValidatedSymptom] = []

    if not raw_items:
        errors.append(
            ValidationIssue(
                code="EMPTY_SYMPTOM_LIST",
                message="At least one symptom must be provided for clinical analysis.",
            )
        )
        return False, [], warnings, errors

    # Deduplicate while preserving highest severity
    severity_rank = {"mild": 1, "moderate": 2, "severe": 3}
    seen_ids: dict[str, SymptomItem] = {}

    for item in raw_items:
        meta = resolve_symptom(item.symptom_id)
        if meta is None:
            errors.append(
                ValidationIssue(
                    code="UNRECOGNIZED_SYMPTOM",
                    message=f"Symptom '{item.symptom_id}' is not in the recognized clinical catalog.",
                    symptom_id=item.symptom_id,
                )
            )
            continue

        resolved_id = meta.id
        if resolved_id in seen_ids:
            existing = seen_ids[resolved_id]
            # If a duplicate was submitted with different severity, keep the more severe one and warn
            if severity_rank[item.severity] > severity_rank[existing.severity]:
                seen_ids[resolved_id] = item
            warnings.append(
                ValidationIssue(
                    code="DUPLICATE_SYMPTOM_MERGED",
                    message=f"Duplicate symptom '{meta.name}' was combined using maximum severity.",
                    symptom_id=resolved_id,
                )
            )
        else:
            seen_ids[resolved_id] = item

    if errors:
        return False, [], warnings, errors

    for resolved_id, item in seen_ids.items():
        meta = SYMPTOM_CATALOG[resolved_id]
        validated.append(
            ValidatedSymptom(
                symptom_id=meta.id,
                name=meta.name,
                category=meta.category,
                severity=item.severity,
                duration_days=item.duration_days,
                clinical_weight=meta.clinical_weight,
                is_red_flag=meta.is_red_flag,
                description=meta.description,
            )
        )

    # Check for clinical contradictions (e.g. concurrent severe weight loss and severe weight gain)
    active_ids = {s.symptom_id for s in validated}
    if "weight_loss" in active_ids and "weight_gain" in active_ids:
        warnings.append(
            ValidationIssue(
                code="CONTRADICTORY_WEIGHT_TREND",
                message="Both 'weight loss' and 'weight gain' are reported; check patient history timeline.",
            )
        )
    if "high_fever" in active_ids and "mild_fever" in active_ids:
        warnings.append(
            ValidationIssue(
                code="CONCURRENT_FEVER_GRADES",
                message="Both 'high fever' and 'mild fever' are reported; prioritizing high fever as primary indicator.",
            )
        )

    # Long duration check
    for item in validated:
        if item.duration_days > 90 and item.severity == "severe":
            warnings.append(
                ValidationIssue(
                    code="CHRONIC_SEVERE_SYMPTOM",
                    message=f"Severe '{item.name}' for {item.duration_days} days indicates possible chronic condition.",
                    symptom_id=item.symptom_id,
                )
            )

    return True, validated, warnings, errors


def compute_pairwise_jaccard(sym_a: str, sym_b: str) -> tuple[float, int]:
    """Compute Jaccard similarity and co-occurrence count across disease profiles."""
    if sym_a == sym_b:
        return 1.0, sum(1 for p in CLINICAL_DISEASE_PROFILES.values() if sym_a in p["symptoms"])

    both = 0
    either = 0
    for profile in CLINICAL_DISEASE_PROFILES.values():
        symptoms_set = profile["symptoms"]
        has_a = sym_a in symptoms_set
        has_b = sym_b in symptoms_set
        if has_a and has_b:
            both += 1
        if has_a or has_b:
            either += 1

    score = round(both / either, 3) if either > 0 else 0.0
    return score, both


def compute_symptom_correlations(
    validated_symptoms: list[ValidatedSymptom],
) -> tuple[
    list[SymptomCorrelationItem],
    list[SuggestedSymptom],
    ClusterCoherence,
    list[str],
    list[str],
]:
    """Analyze correlation between selected symptoms, find unselected co-occurring symptoms,

    and determine cluster coherence index.
    """
    sym_ids = [s.symptom_id for s in validated_symptoms]
    correlated_pairs: list[SymptomCorrelationItem] = []
    total_score = 0.0
    pair_count = 0

    # Calculate pairwise correlation for all combinations
    for i in range(len(sym_ids)):
        for j in range(i + 1, len(sym_ids)):
            sym_a = sym_ids[i]
            sym_b = sym_ids[j]
            score, count = compute_pairwise_jaccard(sym_a, sym_b)
            total_score += score
            pair_count += 1

            if score > 0.05 or count > 0:
                relevance = "High Co-occurrence" if score >= 0.4 else ("Moderate Co-occurrence" if score >= 0.2 else "Weak Association")
                correlated_pairs.append(
                    SymptomCorrelationItem(
                        symptom_a=SYMPTOM_CATALOG[sym_a].name,
                        symptom_b=SYMPTOM_CATALOG[sym_b].name,
                        correlation_score=score,
                        co_occurrence_count=count,
                        clinical_relevance=relevance,
                    )
                )

    correlated_pairs.sort(key=lambda p: p.correlation_score, reverse=True)

    # Determine Cluster Coherence
    if pair_count == 0:
        cluster_coherence: ClusterCoherence = "high"
    else:
        avg_score = total_score / pair_count
        if avg_score >= 0.35:
            cluster_coherence = "high"
        elif avg_score >= 0.15:
            cluster_coherence = "moderate"
        else:
            cluster_coherence = "low"

    # Identify unselected symptoms with highest co-occurrence across the active disease profiles
    selected_set = set(sym_ids)
    candidate_scores: dict[str, float] = defaultdict(float)
    candidate_matches: dict[str, list[str]] = defaultdict(list)

    for profile_name, data in CLINICAL_DISEASE_PROFILES.items():
        disease_symptoms: set[str] = data["symptoms"]
        shared = selected_set.intersection(disease_symptoms)
        if len(shared) >= 1:
            overlap_weight = len(shared) / len(selected_set)
            unselected = disease_symptoms - selected_set
            for cand_id in unselected:
                candidate_scores[cand_id] += overlap_weight
                candidate_matches[cand_id].append(profile_name)

    suggested: list[SuggestedSymptom] = []
    for cand_id, raw_score in candidate_scores.items():
        if cand_id in SYMPTOM_CATALOG:
            meta = SYMPTOM_CATALOG[cand_id]
            norm_score = min(1.0, round(raw_score / max(1, len(selected_set)), 2))
            top_diseases = ", ".join(candidate_matches[cand_id][:2])
            suggested.append(
                SuggestedSymptom(
                    symptom_id=meta.id,
                    name=meta.name,
                    category=meta.category,
                    correlation_score=norm_score,
                    reason=f"Frequently presents alongside your reported symptoms in {top_diseases}.",
                )
            )

    suggested.sort(key=lambda s: s.correlation_score, reverse=True)
    top_suggested = suggested[:4]

    # Primary affected body systems
    category_counts = Counter(s.category for s in validated_symptoms)
    primary_systems = [cat for cat, _ in category_counts.most_common(3)]

    # Potential matching disease categories
    matched_categories: list[tuple[str, int]] = []
    for profile_name, data in CLINICAL_DISEASE_PROFILES.items():
        disease_symptoms: set[str] = data["symptoms"]
        overlap = len(selected_set.intersection(disease_symptoms))
        if overlap >= 2 or (len(selected_set) == 1 and overlap == 1):
            category_label = str(data["category"])
            matched_categories.append((category_label, overlap))

    matched_categories.sort(key=lambda x: x[1], reverse=True)
    seen_cats = set()
    distinct_categories: list[str] = []
    for cat, _ in matched_categories:
        if cat not in seen_cats:
            seen_cats.add(cat)
            distinct_categories.append(cat)

    return (
        correlated_pairs[:8],
        top_suggested,
        cluster_coherence,
        primary_systems,
        distinct_categories[:3],
    )
