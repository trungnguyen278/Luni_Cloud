"""
Luni Server — Structured logging with structlog.

JSON output, context vars for request tracing.
"""

import logging
from uuid import uuid4

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


from app.services.log_db import DBLogProcessor

db_log_processor = DBLogProcessor()


def setup_logging(log_level: str = "INFO") -> None:
    """Configure structured logging for the server."""

    # Set stdlib logging level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(level=numeric_level, format="%(message)s")

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            db_log_processor,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(numeric_level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    db_log_processor.start()


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that adds request context (request_id, method, path) to structured logs."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = str(uuid4())

        # Bind context vars for this request
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        logger = structlog.get_logger()

        # Skip logging for health checks
        if request.url.path == "/api/v1/health":
            response = await call_next(request)
            return response

        logger.info("request.start")

        response = await call_next(request)

        logger.info(
            "request.end",
            status=response.status_code,
        )

        # Add request ID to response headers for tracing
        response.headers["X-Request-ID"] = request_id
        return response
