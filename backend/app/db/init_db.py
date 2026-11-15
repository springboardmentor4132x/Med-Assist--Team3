"""Database table initialization and development demo user seeding."""

from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal
from app.models import User, UserRole

DEMO_ACCOUNTS: tuple[dict[str, str], ...] = (
    {
        "email": "patient@medassist.ai",
        "full_name": "Aarav Sharma",
        "password": "Patient@123",
        "role": UserRole.PATIENT.value,
    },
    {
        "email": "doctor@medassist.ai",
        "full_name": "Dr. Meera Nair",
        "password": "Doctor@123",
        "role": UserRole.DOCTOR.value,
    },
    {
        "email": "clinic@medassist.ai",
        "full_name": "City Care Clinic",
        "password": "Clinic@123",
        "role": UserRole.CLINIC.value,
    },
    {
        "email": "admin@medassist.ai",
        "full_name": "MedAssist System Admin",
        "password": "Admin@123",
        "role": UserRole.ADMIN.value,
    },
)


def seed_demo_users(db: Session) -> None:
    """Create development-only demo accounts if they do not yet exist."""
    existing_emails = set(db.scalars(select(User.email)).all())
    created = False
    for account in DEMO_ACCOUNTS:
        if account["email"] in existing_emails:
            continue
        db.add(
            User(
                email=account["email"],
                full_name=account["full_name"],
                hashed_password=hash_password(account["password"]),
                role=account["role"],
                is_active=True,
            )
        )
        created = True
    if created:
        db.commit()


def init_db(db_engine: Engine, settings: Settings) -> None:
    """Ensure all database tables exist and optionally seed dev demo users."""
    Base.metadata.create_all(bind=db_engine)
    if settings.ENVIRONMENT == "development" and settings.SEED_DEMO_USERS:
        with SessionLocal() as db:
            seed_demo_users(db)

