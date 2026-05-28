"""
Luni Server — Custom exceptions and FastAPI error handlers.

Standard error response format:
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human readable message",
        "details": { ... }
    }
}
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


# === Custom Exception Classes ===


class LuniError(Exception):
    """Base exception for Luni Server."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 500,
        details: dict | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class AuthError(LuniError):
    """Authentication/authorization errors."""

    def __init__(self, message: str = "Authentication required", details: dict | None = None):
        super().__init__("AUTH_REQUIRED", message, 401, details)


class TokenExpiredError(LuniError):
    """JWT token has expired."""

    def __init__(self):
        super().__init__("AUTH_EXPIRED", "Token has expired", 401)


class ForbiddenError(LuniError):
    """User lacks permission."""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__("FORBIDDEN", message, 403)


class NotFoundError(LuniError):
    """Resource not found."""

    def __init__(self, resource: str = "Resource", resource_id: str = ""):
        details = {"resource": resource}
        if resource_id:
            details["id"] = resource_id
        super().__init__("NOT_FOUND", f"{resource} not found", 404, details)


class DeviceOfflineError(LuniError):
    """Device is not currently connected via WebSocket."""

    def __init__(self, device_id: str):
        super().__init__(
            "DEVICE_OFFLINE",
            "Device is not currently connected",
            409,
            {"device_id": device_id},
        )


class ConflictError(LuniError):
    """Resource conflict (e.g., device already registered to another user)."""

    def __init__(self, message: str = "Resource conflict", details: dict | None = None):
        super().__init__("CONFLICT", message, 409, details)


class ValidationError(LuniError):
    """Input validation error."""

    def __init__(self, message: str = "Validation error", details: dict | None = None):
        super().__init__("VALIDATION_ERROR", message, 422, details)


class RateLimitError(LuniError):
    """Too many requests."""

    def __init__(self):
        super().__init__("RATE_LIMITED", "Too many requests, please try again later", 429)


# === Exception Handlers ===


def register_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers on the FastAPI app."""

    @app.exception_handler(LuniError)
    async def luni_error_handler(request: Request, exc: LuniError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_error_handler(request: Request, exc: Exception) -> JSONResponse:
        import structlog
        logger = structlog.get_logger()
        logger.error("unhandled_exception", error=str(exc), exc_info=True)

        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An internal error occurred",
                    "details": {},
                }
            },
        )
