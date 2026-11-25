"""Extra tests for Module 3: probabilities, differential diagnosis, confidence, comprehensive."""

import pytest
from fastapi.testclient import TestClient

URGENCY_LEVELS = {"low", "moderate", "high", "emergency"}
CONFIDENCE_LEVELS = {"High", "Moderate", "Low"}
ENDPOINTS = ["classify", "probabilities", "differential", "confidence", "comprehensive"]

SYMPTOM_SETS = {
    "diabetes": ["polyuria", "polydipsia", "unexplained_weight_loss", "fatigue"],
    "respiratory": ["cough", "breathlessness", "fatigue", "mucoid_sputum"],
    "malaria": ["high_fever", "chills", "sweating", "headache", "nausea"],
    "single": ["fatigue"],
}
SET_NAMES = list(SYMPTOM_SETS.keys())


def post(client: TestClient, endpoint: str, symptoms):
    return client.post(f"/api/v1/predictions/{endpoint}", json={"symptoms": symptoms})


# ---------- Input validation (all 5 endpoints) ----------

@pytest.mark.parametrize("endpoint", ENDPOINTS)
def test_empty_symptom_list_is_rejected(client: TestClient, endpoint: str) -> None:
    assert post(client, endpoint, []).status_code == 422


@pytest.mark.parametrize("endpoint", ENDPOINTS)
def test_missing_symptoms_field_is_rejected(client: TestClient, endpoint: str) -> None:
    response = client.post(f"/api/v1/predictions/{endpoint}", json={})
    assert response.status_code == 422


@pytest.mark.parametrize("endpoint", ENDPOINTS)
def test_symptoms_must_be_a_list(client: TestClient, endpoint: str) -> None:
    response = client.post(f"/api/v1/predictions/{endpoint}", json={"symptoms": "fever"})
    assert response.status_code == 422


@pytest.mark.parametrize("endpoint", ENDPOINTS)
@pytest.mark.parametrize("set_name", SET_NAMES)
def test_valid_symptoms_return_200(client: TestClient, endpoint: str, set_name: str) -> None:
    assert post(client, endpoint, SYMPTOM_SETS[set_name]).status_code == 200


# ---------- Component 2: probability scores ----------

@pytest.mark.parametrize("set_name", SET_NAMES)
def test_probabilities_are_valid_and_sorted(client: TestClient, set_name: str) -> None:
    data = post(client, "probabilities", SYMPTOM_SETS[set_name]).json()
    items = data["probabilities"]
    assert len(items) >= 1
    probs = [item["probability"] for item in items]

    assert all(0.0 <= p <= 1.0 for p in probs)
    assert probs == sorted(probs, reverse=True)
    assert sum(probs) <= 1.01
    for item in items:
        assert abs(item["probability_percent"] - item["probability"] * 100) < 0.5
        assert item["urgency_level"] in URGENCY_LEVELS
    assert len({item["disease"] for item in items}) == len(items)
    assert data["top_prediction"]["disease"] == items[0]["disease"]
    assert data["total_conditions_evaluated"] >= len(items)


# ---------- Component 3: multiple disease prediction ----------

@pytest.mark.parametrize("set_name", SET_NAMES)
def test_differential_candidates_are_ranked(client: TestClient, set_name: str) -> None:
    data = post(client, "differential", SYMPTOM_SETS[set_name]).json()
    candidates = data["candidates"]
    assert len(candidates) >= 1
    assert data["total_candidates"] == len(candidates)
    assert [c["rank"] for c in candidates] == list(range(1, len(candidates) + 1))

    probs = [c["probability"] for c in candidates]
    assert probs == sorted(probs, reverse=True)
    assert data["highest_urgency"] in URGENCY_LEVELS
    assert data["query_symptoms"]
    assert data["clinical_triage_guidance"].strip() != ""
    for c in candidates:
        assert c["clinical_rationale"].strip() != ""
        assert isinstance(c["recommended_diagnostic_tests"], list)
        assert isinstance(c["missing_hallmark_symptoms"], list)


# ---------- Component 4: confidence scoring ----------

@pytest.mark.parametrize("set_name", SET_NAMES)
def test_confidence_values_are_in_range(client: TestClient, set_name: str) -> None:
    data = post(client, "confidence", SYMPTOM_SETS[set_name]).json()
    assert 0.0 <= data["confidence_score"] <= 1.0
    assert abs(data["confidence_percent"] - data["confidence_score"] * 100) < 0.5
    assert data["confidence_level"] in CONFIDENCE_LEVELS
    assert isinstance(data["ambiguity_flag"], bool)
    assert 0.0 <= data["symptom_coverage"] <= 1.0
    assert 0.0 <= data["margin_of_separation"] <= 1.0
    assert isinstance(data["hallmark_symptoms_present"], int)
    assert data["hallmark_symptoms_present"] >= 0
    assert data["clinical_recommendation"].strip() != ""


# ---------- Unified response ----------

@pytest.mark.parametrize("set_name", SET_NAMES)
def test_comprehensive_contains_all_four_components(client: TestClient, set_name: str) -> None:
    data = post(client, "comprehensive", SYMPTOM_SETS[set_name]).json()
    for key in ["classification", "probabilities", "differential_diagnoses",
                "confidence", "triage_urgency", "clinical_summary"]:
        assert key in data
    assert data["classification"]["predicted_disease"]
    assert len(data["probabilities"]) >= 1
    assert len(data["differential_diagnoses"]) >= 1
    assert 0.0 <= data["confidence"]["confidence_score"] <= 1.0
    assert data["triage_urgency"] in URGENCY_LEVELS
    assert data["clinical_summary"].strip() != ""


# ---------- Behaviour and robustness ----------

def test_same_input_gives_same_output(client: TestClient) -> None:
    symptoms = SYMPTOM_SETS["diabetes"]
    first = post(client, "probabilities", symptoms).json()
    second = post(client, "probabilities", symptoms).json()
    assert first == second


def test_symptom_order_does_not_change_top_prediction(client: TestClient) -> None:
    symptoms = SYMPTOM_SETS["malaria"]
    forward = post(client, "probabilities", symptoms).json()
    backward = post(client, "probabilities", list(reversed(symptoms))).json()
    assert forward["top_prediction"]["disease"] == backward["top_prediction"]["disease"]


def test_duplicate_symptoms_do_not_crash(client: TestClient) -> None:
    response = post(client, "comprehensive", ["fatigue", "fatigue", "fatigue"])
    assert response.status_code == 200


def test_unknown_symptom_does_not_cause_server_error(client: TestClient) -> None:
    response = post(client, "comprehensive", ["not_a_real_symptom"])
    assert response.status_code < 500


def test_blank_symptom_does_not_cause_server_error(client: TestClient) -> None:
    response = post(client, "comprehensive", ["   "])
    assert response.status_code < 500
