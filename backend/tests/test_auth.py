"""Comprehensive tests for MedAssist AI login, JWT, RBAC, logout, and error handling."""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import AuthAuditLog, User


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_health_check(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_register_login_and_me_flow(client: TestClient) -> None:
    register_resp = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Priya Verma",
            "email": "Priya.Verma@Example.com",
            "password": "StrongPass1",
            "role": "patient",
        },
    )
    assert register_resp.status_code == 201
    reg_data = register_resp.json()
    assert reg_data["token_type"] == "bearer"
    assert reg_data["user"]["email"] == "priya.verma@example.com"
    assert reg_data["user"]["role"] == "patient"
    assert "hashed_password" not in reg_data["user"]

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "priya.verma@example.com", "password": "StrongPass1"},
    )
    assert login_resp.status_code == 200
    tokens = login_resp.json()
    assert tokens["access_token"]
    assert tokens["refresh_token"]

    me_resp = client.get("/api/v1/auth/me", headers=_auth_header(tokens["access_token"]))
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "priya.verma@example.com"


def test_oauth2_password_form_token_endpoint(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/token",
        data={"username": "doctor@medassist.ai", "password": "Doctor@123"},
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] == "doctor"


def test_duplicate_email_and_admin_self_registration_blocked(client: TestClient) -> None:
    dup = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Duplicate Patient",
            "email": "patient@medassist.ai",
            "password": "Password123",
            "role": "patient",
        },
    )
    assert dup.status_code == 409
    assert dup.json()["error_code"] == "EMAIL_ALREADY_EXISTS"

    admin_attempt = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Privilege Escalation",
            "email": "hacker@medassist.ai",
            "password": "Password123",
            "role": "admin",
        },
    )
    assert admin_attempt.status_code == 403
    assert admin_attempt.json()["error_code"] == "ROLE_NOT_ALLOWED"


def test_invalid_credentials_and_account_lockout(client: TestClient) -> None:
    for _ in range(3):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "patient@medassist.ai", "password": "WrongPassword1"},
        )
        assert resp.status_code == 401
        assert resp.json()["error_code"] == "INVALID_CREDENTIALS"

    locked_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "patient@medassist.ai", "password": "Patient@123"},
    )
    assert locked_resp.status_code == 423
    assert locked_resp.json()["error_code"] == "ACCOUNT_LOCKED"
    assert locked_resp.json()["retry_after_seconds"] > 0


def test_unknown_email_returns_same_generic_invalid_credentials(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@medassist.ai", "password": "SomePassword1"},
    )
    assert resp.status_code == 401
    assert resp.json()["error_code"] == "INVALID_CREDENTIALS"
    assert resp.json()["detail"] == "Invalid email or password."


def test_inactive_account_cannot_login_or_access_protected_routes(
    client: TestClient, db_session: Session
) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "patient@medassist.ai", "password": "Patient@123"},
    )
    token = login.json()["access_token"]

    patient = db_session.scalar(select(User).where(User.email == "patient@medassist.ai"))
    assert patient is not None
    patient.is_active = False
    db_session.commit()

    me_resp = client.get("/api/v1/auth/me", headers=_auth_header(token))
    assert me_resp.status_code == 403
    assert me_resp.json()["error_code"] == "ACCOUNT_INACTIVE"

    relogin = client.post(
        "/api/v1/auth/login",
        json={"email": "patient@medassist.ai", "password": "Patient@123"},
    )
    assert relogin.status_code == 403
    assert relogin.json()["error_code"] == "ACCOUNT_INACTIVE"


def test_protected_routes_and_rbac_enforcement(client: TestClient) -> None:
    unauth = client.get("/api/v1/protected/dashboard")
    assert unauth.status_code == 401
    assert unauth.json()["error_code"] == "MISSING_CREDENTIALS"

    bad_header = client.get(
        "/api/v1/protected/dashboard", headers={"Authorization": "Basic abc123"}
    )
    assert bad_header.status_code == 401
    assert bad_header.json()["error_code"] == "INVALID_AUTH_HEADER"

    patient_token = client.post(
        "/api/v1/auth/login",
        json={"email": "patient@medassist.ai", "password": "Patient@123"},
    ).json()["access_token"]

    assert (
        client.get("/api/v1/protected/dashboard", headers=_auth_header(patient_token)).status_code
        == 200
    )
    assert (
        client.get(
            "/api/v1/protected/patient/profile", headers=_auth_header(patient_token)
        ).status_code
        == 200
    )

    forbidden_doc = client.get(
        "/api/v1/protected/doctor/workspace", headers=_auth_header(patient_token)
    )
    assert forbidden_doc.status_code == 403
    assert forbidden_doc.json()["error_code"] == "INSUFFICIENT_PERMISSIONS"

    admin_token = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@medassist.ai", "password": "Admin@123"},
    ).json()["access_token"]

    admin_logs = client.get(
        "/api/v1/protected/admin/audit-logs", headers=_auth_header(admin_token)
    )
    assert admin_logs.status_code == 200
    assert len(admin_logs.json()) >= 2


def test_logout_revokes_access_and_refresh_tokens(
    client: TestClient, db_session: Session
) -> None:
    login_data = client.post(
        "/api/v1/auth/login",
        json={"email": "doctor@medassist.ai", "password": "Doctor@123"},
    ).json()
    access_token = login_data["access_token"]
    refresh_token = login_data["refresh_token"]

    logout_resp = client.post(
        "/api/v1/auth/logout",
        headers=_auth_header(access_token),
        json={"refresh_token": refresh_token},
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["revoked_tokens"] == 2

    reuse_access = client.get("/api/v1/auth/me", headers=_auth_header(access_token))
    assert reuse_access.status_code == 401
    assert reuse_access.json()["error_code"] == "TOKEN_REVOKED"

    reuse_refresh = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert reuse_refresh.status_code == 401
    assert reuse_refresh.json()["error_code"] == "TOKEN_REVOKED"

    audit_events = db_session.scalars(select(AuthAuditLog.event_type)).all()
    assert "logout" in audit_events


def test_refresh_token_rotation_and_wrong_token_type_rejection(client: TestClient) -> None:
    login_data = client.post(
        "/api/v1/auth/login",
        json={"email": "clinic@medassist.ai", "password": "Clinic@123"},
    ).json()
    access_token = login_data["access_token"]
    refresh_token = login_data["refresh_token"]

    # Passing a refresh token to a protected route must fail with WRONG_TOKEN_TYPE
    wrong_use = client.get("/api/v1/auth/me", headers=_auth_header(refresh_token))
    assert wrong_use.status_code == 401
    assert wrong_use.json()["error_code"] == "WRONG_TOKEN_TYPE"

    # Passing an access token to /refresh must also fail
    wrong_refresh = client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
    assert wrong_refresh.status_code == 401
    assert wrong_refresh.json()["error_code"] == "WRONG_TOKEN_TYPE"

    # Valid refresh rotates token and revokes the old refresh token
    rotated = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert rotated.status_code == 200
    new_tokens = rotated.json()
    assert new_tokens["access_token"] != access_token
    assert new_tokens["refresh_token"] != refresh_token

    replay_old = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert replay_old.status_code == 401
    assert replay_old.json()["error_code"] == "TOKEN_REVOKED"


def test_expired_and_tampered_jwt_errors(
    client: TestClient, test_settings: Settings
) -> None:
    expired_payload = {
        "sub": "1",
        "email": "patient@medassist.ai",
        "role": "patient",
        "jti": "expired-jti-123",
        "type": "access",
        "iat": int((datetime.now(UTC) - timedelta(hours=2)).timestamp()),
        "exp": int((datetime.now(UTC) - timedelta(hours=1)).timestamp()),
    }
    expired_token = jwt.encode(
        expired_payload, test_settings.JWT_SECRET_KEY, algorithm=test_settings.JWT_ALGORITHM
    )

    exp_resp = client.get("/api/v1/auth/me", headers=_auth_header(expired_token))
    assert exp_resp.status_code == 401
    assert exp_resp.json()["error_code"] == "TOKEN_EXPIRED"

    tampered_resp = client.get("/api/v1/auth/me", headers=_auth_header("not.a.valid.jwt"))
    assert tampered_resp.status_code == 401
    assert tampered_resp.json()["error_code"] == "INVALID_TOKEN"


def test_rate_limiting_returns_429(client: TestClient) -> None:
    for _ in range(10):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "ratelimit@medassist.ai", "password": "BadPassword1"},
        )
        assert resp.status_code == 401

    throttled = client.post(
        "/api/v1/auth/login",
        json={"email": "ratelimit@medassist.ai", "password": "BadPassword1"},
    )
    assert throttled.status_code == 429
    assert throttled.json()["error_code"] == "RATE_LIMIT_EXCEEDED"
    assert "Retry-After" in throttled.headers


def test_demo_accounts_disabled_outside_development(client: TestClient) -> None:
    resp = client.get("/api/v1/auth/demo-accounts")
    assert resp.status_code == 404

