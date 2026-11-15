"""Structured authentication error types and FastAPI exception handlers."""

from enum import StrEnum
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AuthErrorCode(StrEnum):
    """Machine-readable error codes returned by the authentication API."""

    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    MISSING_CREDENTIALS = "MISSING_CREDENTIALS"
    INVALID_AUTH_HEADER = "INVALID_AUTH_HEADER"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_REVOKED = "TOKEN_REVOKED"
    WRONG_TOKEN_TYPE = "WRONG_TOKEN_TYPE"
    ACCOUNT_INACTIVE = "ACCOUNT_INACTIVE"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    ROLE_NOT_ALLOWED = "ROLE_NOT_ALLOWED"
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class AppAuthException(Exception):
    """Domain exception carrying an HTTP status code and structured error code."""

    def __init__(
        self,
        status_code: int,
        error_code: AuthErrorCode,
        detail: str,
        headers: dict[str, str] | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.error_code = error_code
        self.detail = detail
        self.headers = dict(headers) if headers else {}
        if status_code == status.HTTP_401_UNAUTHORIZED and "WWW-Authenticate" not in self.headers:
            self.headers["WWW-Authenticate"] = "Bearer"
        self.extra = extra or {}


def register_exception_handlers(app: FastAPI) -> None:
    """Register uniform JSON error handlers on the FastAPI application."""

    @app.exception_handler(AppAuthException)
    async def handle_app_auth_exception(
        _request: Request, exc: AppAuthException
    ) -> JSONResponse:
        payload: dict[str, Any] = {
            "detail": exc.detail,
            "error_code": exc.error_code.value,
            "status_code": exc.status_code,
        }
        if exc.extra:
            payload.update(exc.extra)
        return JSONResponse(
            status_code=exc.status_code,
            content=payload,
            headers=exc.headers or None,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_exception(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        formatted_errors = [
            {
                "field": ".".join(str(loc) for loc in err["loc"] if loc != "body") or "body",
                "message": err["msg"],
            }
            for err in exc.errors()
        ]
        first_message = (
            formatted_errors[0]["message"] if formatted_errors else "Invalid request payload."
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": first_message,
                "error_code": AuthErrorCode.VALIDATION_ERROR.value,
                "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "errors": formatted_errors,
            },
        )

    @app.exception_handler(HTTPException)
    async def handle_http_exception(_request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": str(exc.detail),
                "error_code": f"HTTP_{exc.status_code}",
                "status_code": exc.status_code,
            },
            headers=exc.headers,
        )

