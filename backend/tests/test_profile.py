
"""Automated tests for MedAssist AI profile management."""

import pytest
from fastapi.testclient import TestClient


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _login(client: TestClient, email: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.mark.parametrize(
    ("email", "password", "expected_role"),
    [
        ("patient@medassist.ai", "Patient@123", "patient"),
        ("doctor@medassist.ai", "Doctor@123", "doctor"),
        ("clinic@medassist.ai", "Clinic@123", "clinic"),
        ("admin@medassist.ai", "Admin@123", "admin"),
    ],
)
def test_each_role_can_view_own_profile(
    client: TestClient,
    email: str,
    password: str,
    expected_role: str,
) -> None:
    token = _login(client, email, password)

    response = client.get(
        "/api/v1/profile/me",
        headers=_auth_header(token),
    )

    assert response.status_code == 200
    profile = response.json()
    assert profile["email"] == email
    assert profile["role"] == expected_role
    assert profile["is_active"] is True
    assert "id" in profile
    assert "created_at" in profile
    assert "updated_at" in profile
    assert "hashed_password" not in profile


def test_update_own_profile_name(client: TestClient) -> None:
    token = _login(client, "patient@medassist.ai", "Patient@123")

    update_response = client.put(
        "/api/v1/profile/me",
        headers=_auth_header(token),
        json={"full_name": "Priya Updated"},
    )

    assert update_response.status_code == 200
    assert update_response.json()["full_name"] == "Priya Updated"

    # Verify the updated value is saved in the database.
    get_response = client.get(
        "/api/v1/profile/me",
        headers=_auth_header(token),
    )

    assert get_response.status_code == 200
    assert get_response.json()["full_name"] == "Priya Updated"


def test_profile_rejects_role_modification(client: TestClient) -> None:
    token = _login(client, "patient@medassist.ai", "Patient@123")

    response = client.put(
        "/api/v1/profile/me",
        headers=_auth_header(token),
        json={"role": "admin"},
    )

    assert response.status_code == 422

    # Confirm the user's actual role remains unchanged.
    profile = client.get(
        "/api/v1/profile/me",
        headers=_auth_header(token),
    )
    assert profile.json()["role"] == "patient"


def test_profile_rejects_email_modification(client: TestClient) -> None:
    token = _login(client, "patient@medassist.ai", "Patient@123")

    response = client.put(
        "/api/v1/profile/me",
        headers=_auth_header(token),
        json={"email": "changed@example.com"},
    )

    assert response.status_code == 422

    profile = client.get(
        "/api/v1/profile/me",
        headers=_auth_header(token),
    )
    assert profile.json()["email"] == "patient@medassist.ai"


def test_profile_update_rejects_empty_payload(client: TestClient) -> None:
    token = _login(client, "patient@medassist.ai", "Patient@123")

    response = client.put(
        "/api/v1/profile/me",
        headers=_auth_header(token),
        json={},
    )

    assert response.status_code == 400


def test_profile_update_rejects_null_name(client: TestClient) -> None:
    token = _login(client, "patient@medassist.ai", "Patient@123")

    response = client.put(
        "/api/v1/profile/me",
        headers=_auth_header(token),
        json={"full_name": None},
    )

    assert response.status_code == 422


def test_profile_endpoints_require_authentication(client: TestClient) -> None:
    get_response = client.get("/api/v1/profile/me")
    assert get_response.status_code == 401

    update_response = client.put(
        "/api/v1/profile/me",
        json={"full_name": "Unauthorised Update"},
    )
    assert update_response.status_code == 401
