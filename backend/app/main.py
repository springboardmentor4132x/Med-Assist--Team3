"""FastAPI application entrypoint for MedAssist AI Authentication Service."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.protected import router as protected_router
from app.core.config import Settings, get_settings
from app.core.exceptions import register_exception_handlers
from app.db.init_db import init_db
from app.db.session import engine


def create_app(
    custom_settings: Settings | None = None,
    *,
    init_db_on_startup: bool = True,
) -> FastAPI:
    """Construct and configure the FastAPI application instance."""
    settings = custom_settings or get_settings()

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        """Validate security configuration and initialize database schema on startup."""
        settings.validate_security()
        if init_db_on_startup:
            init_db(engine, settings)
        yield

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "MedAssist AI — Medical Symptom Analysis & Disease Prediction System: "
            "JWT Authentication, RBAC Protected Routes, Credential Verification, and Audit Logging."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    @app.get("/health", tags=["Health"])
    def health_check() -> dict[str, str]:
        """Liveness check endpoint for Docker and load balancers."""
        return {"status": "healthy", "service": settings.APP_NAME}

    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(protected_router, prefix="/api/v1")
    return app


app = create_app()

