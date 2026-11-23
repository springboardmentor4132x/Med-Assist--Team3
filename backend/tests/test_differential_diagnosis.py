"""Comprehensive test suite for Module 3 (Component 3: Multiple Disease Prediction / Differential Diagnosis)."""

from fastapi.testclient import TestClient


def test_differential_diagnosis_respiratory_overlap(client: TestClient) -> None:
    # Symptoms overlapping Pneumonia, Bronchial Asthma, and COVID-19
    payload = {
        "symptoms": ["cough", "breathlessness", "chest_pain", "high_fever"]
    }
    response = client.post("/api/v1/predictions/differential", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["candidates"]) >= 3
    assert data["highest_urgency"] in ["high", "emergency"]
    assert "URGENT" in data["clinical_triage_guidance"] or "CRITICAL" in data["clinical_triage_guidance"]

    # Verify candidate properties
    first = data["candidates"][0]
    assert first["rank"] == 1
    assert first["probability"] > 0.0
    assert len(first["recommended_diagnostic_tests"]) > 0
    assert "Ranked #1" in first["clinical_rationale"]
    assert isinstance(first["missing_hallmark_symptoms"], list)


def test_differential_diagnosis_emergency_escalation(client: TestClient) -> None:
    # Cardiac emergency presentation
    payload = {
        "symptoms": ["chest_pain", "radiating_arm_pain", "cold_sweats"]
    }
    response = client.post("/api/v1/predictions/differential", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["highest_urgency"] == "emergency"
    assert "CRITICAL" in data["clinical_triage_guidance"]
    cardiac_candidate = next((c for c in data["candidates"] if c["disease"].lower() == "heart attack"), None)
    assert cardiac_candidate is not None
    assert "12-Lead Serial Electrocardiogram (ECG)" in cardiac_candidate["recommended_diagnostic_tests"]


def test_differential_diagnosis_ranking_order(client: TestClient) -> None:
    payload = {
        "symptoms": ["polyuria", "polydipsia", "unexplained_weight_loss"]
    }
    response = client.post("/api/v1/predictions/differential", json=payload)
    assert response.status_code == 200
    data = response.json()
    ranks = [c["rank"] for c in data["candidates"]]
    assert ranks == list(range(1, len(data["candidates"]) + 1))
    probs = [c["probability"] for c in data["candidates"]]
    assert probs == sorted(probs, reverse=True)


def test_differential_diagnosis_empty_list_returns_422(client: TestClient) -> None:
    payload = {"symptoms": []}
    response = client.post("/api/v1/predictions/differential", json=payload)
    assert response.status_code == 422
