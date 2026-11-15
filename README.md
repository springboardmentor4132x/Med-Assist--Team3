# MedAssist AI — Medical Symptom Analysis & Disease Prediction System

Repository for **Team 3** implementing the **MedAssist AI** platform.

## Branch Scope: `feature/login` (Person 2 — Login & Authentication)

Implements the **User Management & API Security Layer** defined in the MedAssist AI architecture:

- **Login & Registration UI (`frontend/`)**: React + TypeScript + Tailwind CSS healthcare authentication portal (`/login`, `/register`, `/dashboard`) with client/server validation, password visibility toggle, remember-me session storage, and protected route guards.
- **Login & Credential Verification (`backend/`)**: FastAPI `/api/v1/auth/login`, `/api/v1/auth/token` (OAuth2 password flow), and `/api/v1/auth/register` with `bcrypt` password verification, email normalization, failed-login tracking, temporary account lockout, and sliding-window rate limiting.
- **JWT Generation & Rotation**: HS256 signed short-lived access tokens + refresh token rotation (`POST /api/v1/auth/refresh`) with unique `jti` claims.
- **Protected API Routes & RBAC**: `get_current_user` and `require_roles(...)` dependencies enforcing access across `patient`, `doctor`, `clinic`, and `admin` roles (`/api/v1/auth/me`, `/api/v1/protected/dashboard`, `/patient/profile`, `/doctor/workspace`, `/clinic/overview`, `/admin/audit-logs`).
- **Logout & Token Revocation**: `POST /api/v1/auth/logout` revokes access and refresh token `jti` identifiers server-side and records audit trail entries.
- **Structured Authentication Error Handling**: Consistent JSON errors (`error_code`, `detail`, `status_code`) across invalid credentials (`401`), expired/tampered/revoked JWTs (`401`), inactive accounts & insufficient RBAC permissions (`403`), account lockouts (`423`), rate limiting (`429`), and validation errors (`422`).

---

## Quick Start (Local Development)

### 1. Backend (FastAPI + Python 3.11+)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

- Uses SQLite (`medassist_auth.db`) automatically when `DATABASE_URL` is unset; set `DATABASE_URL=postgresql+psycopg://...` in `backend/.env` for PostgreSQL.
- Interactive OpenAPI docs: http://127.0.0.1:8000/docs

### 2. Frontend (React + Vite + Tailwind CSS)

```powershell
cd frontend
npm install
npm run dev
```

- Opens at http://localhost:5173 (proxies `/api` requests to `http://127.0.0.1:8000`).

### 3. Running Automated Tests

```powershell
# Backend tests
cd backend
.\.venv\Scripts\pytest -v

# Frontend tests & production build check
cd frontend
npm test
npm run build
```

### 4. Docker Compose (PostgreSQL + Backend + Frontend)

```powershell
docker compose up --build
```
