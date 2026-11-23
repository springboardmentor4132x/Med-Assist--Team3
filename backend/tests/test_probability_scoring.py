"""Comprehensive test suite for Module 3 (Component 2: Probability Score Generation)."""

from fastapi.testclient import TestClient


def test_generate_diabetes_probabilities(client: TestClient) -> None:
    payload = {
        "symptoms": ["polyuria", "polydipsia", "unexplained_weight_loss", "fatigue"]
    }
    response = client.post("/api/v1/predictions/probabilities", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["top_prediction"]["disease"] == "Diabetes"
    assert data["top_prediction"]["probability"] > 0.4
    assert data["top_prediction"]["probability_percent"] > 40.0
    assert len(data["probabilities"]) >= 3
    # Check descending order of probabilities
    probs = [item["probability"] for item in data["probabilities"]]
    assert probs == sorted(probs, reverse=True)
    assert data["total_conditions_evaluated"] >= 20


def test_generate_asthma_probabilities(client: TestClient) -> None:
    payload = {
        "symptoms": ["wheezing", "breathlessness", "cough", "chest_tightness"]
    }
    response = client.post("/api/v1/predictions/probabilities", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["top_prediction"]["disease"] == "Bronchial Asthma"
    assert data["dominant_category"] == "Respiratory"
    assert data["top_prediction"]["category"] == "Respiratory"


def test_probabilities_bounds_and_validity(client: TestClient) -> None:
    payload = {
        "symptoms": ["high_fever", "chills", "sweating", "headache"]
    }
    response = client.post("/api/v1/predictions/probabilities", json=payload)
    assert response.status_code == 200
    data = response.json()
    for item in data["probabilities"]:
        assert 0.0 <= item["probability"] <= 1.0
        assert 0.0 <= item["probability_percent"] <= 100.0
        assert round(item["probability"] * 100.0, 2) == item["probability_percent"]
        assert item["icd10"] != ""
        assert item["urgency_level"] in ["low", "moderate", "high", "emergency"]


def test_probabilities_unmapped_symptoms(client: TestClient) -> None:
    payload = {
        "symptoms": ["completely_invented_symptom_xyz"]
    }
    response = client.post("/api/v1/predictions/probabilities", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Undetermined" in data["top_prediction"]["disease"]
    assert data["top_prediction"]["urgency_level"] == "low"


def test_probabilities_empty_list_returns_422(client: TestClient) -> None:
    payload = {"symptoms": []}
    response = client.post("/api/v1/predictions/probabilities", json=payload)
    assert response.status_code == 422
