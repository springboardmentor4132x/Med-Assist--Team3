"""Protected RBAC endpoints demonstrating MedAssist AI module access control."""

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.models import AuthAuditLog, User, UserRole
from app.schemas.auth import AuditLogResponse, ProtectedResourceResponse, UserResponse

router = APIRouter(prefix="/protected", tags=["Protected RBAC Routes"])

ROLE_CAPABILITIES: dict[str, list[str]] = {
    UserRole.PATIENT.value: [
        "Submit symptom checkups",
        "View preliminary disease predictions & risk levels",
        "Download personal health summary reports",
    ],
    UserRole.DOCTOR.value: [
        "Review patient symptom analyses & prediction confidence",
        "Validate risk assessments & urgent flags",
        "Provide clinical recommendations & follow-up notes",
    ],
    UserRole.CLINIC.value: [
        "Manage clinic patient intake workflows",
        "Monitor regional symptom trends & risk distribution",
        "Export clinical summary reports",
    ],
    UserRole.ADMIN.value: [
        "Inspect platform-wide authentication audit logs",
        "Monitor system insights & RBAC compliance",
        "Access all clinical and administrative modules",
    ],
}


@router.get(
    "/dashboard",
    response_model=ProtectedResourceResponse,
    summary="Authenticated MedAssist AI dashboard summary",
)
def get_dashboard(
    current_user: User = Depends(get_current_user),
) -> ProtectedResourceResponse:
    """Return role-aware module access info for any authenticated active user."""
    actions = ROLE_CAPABILITIES.get(current_user.role, [])
    return ProtectedResourceResponse(
        message=f"Welcome to MedAssist AI, {current_user.full_name}.",
        module="User Management & Gateway",
        role=current_user.role,
        user=UserResponse.model_validate(current_user),
        allowed_actions=actions,
        data={
            "auth_protocol": "JWT Bearer (HS256)",
            "rbac_enforced": True,
            "available_modules": [
                "Symptom Analysis Module",
                "Disease Prediction Module",
                "Risk Assessment Module",
                "Treatment Recommendation Module",
                "Health Reports Module",
                "Analytics Dashboard Module",
            ],
        },
    )


@router.get(
    "/patient/profile",
    response_model=ProtectedResourceResponse,
    summary="Protected patient profile and symptom history access (Patient, Doctor, Admin)",
)
def get_patient_profile(
    current_user: User = Depends(
        require_roles(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
    ),
) -> ProtectedResourceResponse:
    """Protected route restricted to patients, doctors, and admins."""
    return ProtectedResourceResponse(
        message="Patient profile & medical history endpoint authorized.",
        module="User Management — Patient Profile",
        role=current_user.role,
        user=UserResponse.model_validate(current_user),
        allowed_actions=ROLE_CAPABILITIES.get(current_user.role, []),
        data={
            "permitted_roles": ["patient", "doctor", "admin"],
            "patient_records_ready": True,
        },
    )


@router.get(
    "/doctor/workspace",
    response_model=ProtectedResourceResponse,
    summary="Protected clinician workspace (Doctor, Clinic, Admin only)",
)
def get_doctor_workspace(
    current_user: User = Depends(
        require_roles(UserRole.DOCTOR, UserRole.CLINIC, UserRole.ADMIN)
    ),
) -> ProtectedResourceResponse:
    """Protected route demonstrating RBAC exclusion of non-clinical patient accounts."""
    return ProtectedResourceResponse(
        message="Doctor clinical consultation workspace authorized.",
        module="Clinical Decision Support",
        role=current_user.role,
        user=UserResponse.model_validate(current_user),
        allowed_actions=ROLE_CAPABILITIES.get(current_user.role, []),
        data={
            "permitted_roles": ["doctor", "clinic", "admin"],
            "triage_queue_enabled": True,
        },
    )


@router.get(
    "/clinic/overview",
    response_model=ProtectedResourceResponse,
    summary="Protected clinic analytics overview (Clinic, Admin only)",
)
def get_clinic_overview(
    current_user: User = Depends(require_roles(UserRole.CLINIC, UserRole.ADMIN)),
) -> ProtectedResourceResponse:
    """Protected route restricted to clinic operators and administrators."""
    return ProtectedResourceResponse(
        message="Clinic operations & analytics overview authorized.",
        module="Analytics Dashboard — Clinic",
        role=current_user.role,
        user=UserResponse.model_validate(current_user),
        allowed_actions=ROLE_CAPABILITIES.get(current_user.role, []),
        data={
            "permitted_roles": ["clinic", "admin"],
            "analytics_stream_ready": True,
        },
    )


@router.get(
    "/admin/audit-logs",
    response_model=list[AuditLogResponse],
    summary="Protected platform-wide security audit trail (Admin only)",
)
def get_all_audit_logs(
    _admin_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> list[AuditLogResponse]:
    """Return latest 50 platform-wide authentication audit events for admins."""
    rows = db.scalars(
        select(AuthAuditLog)
        .order_by(desc(AuthAuditLog.created_at), desc(AuthAuditLog.id))
        .limit(50)
    ).all()
    return [AuditLogResponse.model_validate(row) for row in rows]

