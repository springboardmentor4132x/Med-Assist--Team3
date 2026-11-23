"""Comprehensive test suite for Module 3 (Component 1: Disease Classification)."""

from fastapi.testclient import TestClient


def test_classify_diabetes_symptoms(client: TestClient) -> None:
    payload = {
        "symptoms": ["polyuria", "polydipsia", "unexplained_weight_loss", "fatigue"]
    }
    response = client.post("/api/v1/predictions/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_disease"] == "Diabetes"
    assert "Diabetes" in data["display_name"]
    assert data["category"] == "Endocrine"
    assert data["icd10"] == "E11"
    assert data["urgency_level"] == "moderate"
    assert len(data["matched_symptoms"]) >= 3
    assert data["match_ratio"] > 0.6


def test_classify_asthma_symptoms(client: TestClient) -> None:
    payload = {
        "symptoms": ["wheezing", "breathlessness", "cough", "chest_tightness"]
    }
    response = client.post("/api/v1/predictions/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_disease"] == "Bronchial Asthma"
    assert data["category"] == "Respiratory"
    assert data["icd10"] == "J45"
    assert data["urgency_level"] == "high"


def test_classify_pneumonia_symptoms(client: TestClient) -> None:
    payload = {
        "symptoms": ["high_fever", "cough_with_sputum", "breathlessness", "chest_pain", "chills"]
    }
    response = client.post("/api/v1/predictions/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_disease"] == "Pneumonia"
    assert data["category"] == "Respiratory"
    assert data["icd10"] == "J18"


def test_classify_malaria_symptoms(client: TestClient) -> None:
    payload = {
        "symptoms": ["high_fever", "chills", "sweating", "headache", "nausea"]
    }
    response = client.post("/api/v1/predictions/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_disease"] == "Malaria"
    assert data["category"] == "Infectious"
    assert data["icd10"] == "B54"


def test_classify_heart_attack_emergency(client: TestClient) -> None:
    payload = {
        "symptoms": ["chest_pain", "radiating_arm_pain", "cold_sweats", "breathlessness"]
    }
    response = client.post("/api/v1/predictions/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_disease"] == "Heart Attack"
    assert data["urgency_level"] == "emergency"
    assert data["category"] == "Cardiovascular"


def test_classify_with_aliases_normalization(client: TestClient) -> None:
    # Uses common clinical aliases like 'shortness of breath' and 'fever'
    payload = {
        "symptoms": ["shortness of breath", "fever", "cough", "wheezing"]
    }
    response = client.post("/api/v1/predictions/classify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_disease"] in ["Bronchial Asthma", "Pneumonia", "COVID-19"]


def test_classify_empty_list_returns_422(client: TestClient) -> None:
    payload = {"symptoms": []}
    response = client.post("/api/v1/predictions/classify", json=payload)
    assert response.status_code == 422
