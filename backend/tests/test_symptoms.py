"""Comprehensive test suite for Module 2: Symptom Validation and Correlation Analysis."""

from fastapi.testclient import TestClient


def test_get_symptoms_catalog_returns_items(client: TestClient) -> None:
    response = client.get("/api/v1/symptoms")
    assert response.status_code == 200
    catalog = response.json()
    assert len(catalog) >= 20
    first = catalog[0]
    assert "id" in first
    assert "name" in first
    assert "category" in first
    assert "clinical_weight" in first
    assert "is_red_flag" in first


def test_get_symptoms_catalog_search_and_filters(client: TestClient) -> None:
    # Search by alias
    alias_resp = client.get("/api/v1/symptoms?search=shortness of breath")
    assert alias_resp.status_code == 200
    results = alias_resp.json()
    assert any(s["id"] == "breathlessness" for s in results)

    # Filter by category
    resp_category = client.get("/api/v1/symptoms?category=Respiratory")
    assert resp_category.status_code == 200
    resp_items = resp_category.json()
    assert all(s["category"] == "Respiratory" for s in resp_items)
    assert any(s["id"] == "cough" for s in resp_items)

    # Filter by red-flag
    red_resp = client.get("/api/v1/symptoms?is_red_flag=true")
    assert red_resp.status_code == 200
    red_items = red_resp.json()
    assert all(s["is_red_flag"] is True for s in red_items)
    assert any(s["id"] == "chest_pain" for s in red_items)


def test_get_symptom_categories_summary(client: TestClient) -> None:
    response = client.get("/api/v1/symptoms/categories")
    assert response.status_code == 200
    categories = response.json()
    assert len(categories) >= 5
    cat_names = [c["category"] for c in categories]
    assert "Respiratory" in cat_names
    assert "Cardiovascular" in cat_names
    assert "Neurological" in cat_names


def test_validate_symptoms_with_alias_normalization(client: TestClient) -> None:
    payload = {
        "symptoms": [
            {"symptom_id": "dry cough", "severity": "mild", "duration_days": 3},
            {"symptom_id": "shortness of breath", "severity": "severe", "duration_days": 2},
        ]
    }
    response = client.post("/api/v1/symptoms/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["total_submitted"] == 2
    ids = [s["symptom_id"] for s in data["validated_symptoms"]]
    assert "cough" in ids
    assert "breathlessness" in ids
    # Verify severity was preserved
    breath_item = next(s for s in data["validated_symptoms"] if s["symptom_id"] == "breathlessness")
    assert breath_item["severity"] == "severe"
    assert breath_item["is_red_flag"] is True


def test_validate_symptoms_merges_duplicate_inputs(client: TestClient) -> None:
    payload = {
        "symptoms": [
            {"symptom_id": "cough", "severity": "mild", "duration_days": 2},
            {"symptom_id": "cough", "severity": "severe", "duration_days": 5},
        ]
    }
    response = client.post("/api/v1/symptoms/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    # Merged into single symptom keeping max severity
    assert len(data["validated_symptoms"]) == 1
    assert data["validated_symptoms"][0]["severity"] == "severe"
    # Check warning was logged
    warning_codes = [w["code"] for w in data["warnings"]]
    assert "DUPLICATE_SYMPTOM_MERGED" in warning_codes


def test_validate_symptoms_unrecognized_returns_error(client: TestClient) -> None:
    payload = {
        "symptoms": [
            {"symptom_id": "nonexistent_fake_symptom_xyz", "severity": "mild", "duration_days": 1}
        ]
    }
    response = client.post("/api/v1/symptoms/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is False
    assert len(data["errors"]) >= 1
    assert data["errors"][0]["code"] == "UNRECOGNIZED_SYMPTOM"


def test_validate_symptoms_contradiction_warning(client: TestClient) -> None:
    payload = {
        "symptoms": [
            {"symptom_id": "weight_loss", "severity": "moderate", "duration_days": 14},
            {"symptom_id": "weight_gain", "severity": "moderate", "duration_days": 14},
        ]
    }
    response = client.post("/api/v1/symptoms/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    warning_codes = [w["code"] for w in data["warnings"]]
    assert "CONTRADICTORY_WEIGHT_TREND" in warning_codes


def test_analyze_symptoms_respiratory_cluster(client: TestClient) -> None:
    payload = {
        "symptoms": [
            {"symptom_id": "cough", "severity": "moderate", "duration_days": 4},
            {"symptom_id": "high_fever", "severity": "severe", "duration_days": 3},
            {"symptom_id": "breathlessness", "severity": "severe", "duration_days": 2},
        ]
    }
    response = client.post("/api/v1/symptoms/analyze", json=payload)
    assert response.status_code == 200
    result = response.json()

    assert result["session_id"]
    assert len(result["validated_symptoms"]) == 3
    assert result["has_red_flags"] is True
    assert "Breathlessness" in result["red_flag_symptoms"] or "High Fever" in result["red_flag_symptoms"]

    # Cluster coherence should be high or moderate
    assert result["cluster_coherence"] in ("high", "moderate")

    # Correlated pairs
    pairs = result["top_correlated_pairs"]
    assert len(pairs) >= 1
    pair_names = [(p["symptom_a"], p["symptom_b"]) for p in pairs]
    # Check that pairwise metrics exist
    assert any("Cough" in pair or "Breathlessness" in pair for pair in pair_names)

    # Suggested co-occurring symptoms should recommend phlegm, chills, or chest pain
    suggested = result["suggested_co_occurring_symptoms"]
    assert len(suggested) >= 1
    suggested_ids = [s["symptom_id"] for s in suggested]
    assert any(s in suggested_ids for s in ["phlegm", "chills", "chest_pain", "rusty_sputum"])

    # Primary systems
    assert "Respiratory" in result["primary_affected_systems"]


def test_analyze_symptoms_single_symptom_works(client: TestClient) -> None:
    payload = {
        "symptoms": [
            {"symptom_id": "headache", "severity": "mild", "duration_days": 1}
        ]
    }
    response = client.post("/api/v1/symptoms/analyze", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert len(result["validated_symptoms"]) == 1
    assert result["primary_affected_systems"] == ["Neurological"]
    assert len(result["suggested_co_occurring_symptoms"]) >= 1


def test_analyze_symptoms_unrecognized_returns_422(client: TestClient) -> None:
    payload = {
        "symptoms": [
            {"symptom_id": "totally_invalid_symptom_12345", "severity": "mild", "duration_days": 1}
        ]
    }
    response = client.post("/api/v1/symptoms/analyze", json=payload)
    assert response.status_code == 422
    assert "not in the recognized clinical catalog" in response.json()["detail"]


def test_analyze_symptoms_empty_list_returns_422(client: TestClient) -> None:
    payload = {"symptoms": []}
    response = client.post("/api/v1/symptoms/analyze", json=payload)
    assert response.status_code == 422
