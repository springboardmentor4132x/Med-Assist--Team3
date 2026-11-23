"""Comprehensive test suite for Module 3 (Component 4: Prediction Confidence Scoring)."""

from fastapi.testclient import TestClient


def test_confidence_scoring_high_confidence(client: TestClient) -> None:
    # Classic Diabetic presentation with hallmark triad
    payload = {
        "symptoms": ["polyuria", "polydipsia", "unexplained_weight_loss", "fatigue", "increased_appetite"]
    }
    response = client.post("/api/v1/predictions/confidence", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["confidence_level"] in ["High", "Moderate"]
    assert data["confidence_score"] > 0.50
    assert data["confidence_percent"] > 50.0
    assert data["hallmark_symptoms_present"] >= 3
    assert data["symptom_coverage"] > 0.5
    assert not data["ambiguity_flag"]
    assert "diagnostic confidence" in data["clinical_recommendation"].lower()


def test_confidence_scoring_ambiguity_flag(client: TestClient) -> None:
    # Ambiguous single symptom shared by many diseases
    payload = {
        "symptoms": ["headache"]
    }
    response = client.post("/api/v1/predictions/confidence", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["confidence_score"] <= 1.0
    assert data["confidence_level"] in ["Low", "Moderate"]
    assert data["margin_of_separation"] >= 0.0


def test_confidence_scoring_unmapped_symptoms(client: TestClient) -> None:
    payload = {
        "symptoms": ["random_unregistered_symptom_abc"]
    }
    response = client.post("/api/v1/predictions/confidence", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["confidence_level"] == "Low"
    assert data["ambiguity_flag"] is True
    assert data["confidence_score"] <= 0.20


def test_confidence_scoring_empty_list_returns_422(client: TestClient) -> None:
    payload = {"symptoms": []}
    response = client.post("/api/v1/predictions/confidence", json=payload)
    assert response.status_code == 422


def test_comprehensive_prediction_endpoint(client: TestClient) -> None:
    payload = {
        "symptoms": ["cough", "breathlessness", "fatigue", "mucoid_sputum"]
    }
    response = client.post("/api/v1/predictions/comprehensive", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Component 1 verification
    assert data["classification"]["predicted_disease"] == "Bronchial Asthma"
    assert data["classification"]["category"] == "Respiratory"

    # Component 2 verification
    assert len(data["probabilities"]) >= 3
    assert data["probabilities"][0]["disease"] == "Bronchial Asthma"

    # Component 3 verification
    assert len(data["differential_diagnoses"]) >= 3
    assert data["differential_diagnoses"][0]["rank"] == 1
    assert len(data["differential_diagnoses"][0]["recommended_diagnostic_tests"]) > 0

    # Component 4 verification
    assert data["confidence"]["confidence_level"] in ["High", "Moderate"]
    assert data["confidence"]["confidence_score"] > 0.50

    # Overall triage summary
    assert data["triage_urgency"] in ["high", "emergency"]
    assert len(data["clinical_summary"]) > 20
