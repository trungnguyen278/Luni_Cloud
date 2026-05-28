"""
Luni Server — FastAPI Application Factory.

Lifespan handler manages startup/shutdown of DB, Redis, and scheduler.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.api.ws.app_client import router as ws_app_router
from app.api.ws.device import router as ws_device_router
from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.db.database import engine
from app.services.ws_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    settings = get_settings()
    setup_logging(settings.log_level)

    # Log startup
    import structlog
    logger = structlog.get_logger()
    logger.info(
        "server.starting",
        environment=settings.environment,
        domain=settings.domain,
    )

    # Initialize Redis connection for WS manager
    import redis.asyncio as aioredis
    manager.redis = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
    )

    # Start background scheduler
    from app.tasks.scheduler import start_scheduler
    start_scheduler()

    logger.info("server.started")

    yield

    # Shutdown
    logger.info("server.shutting_down")
    from app.tasks.scheduler import shutdown_scheduler
    shutdown_scheduler()

    from app.core.logging import db_log_processor
    await db_log_processor.stop()

    if manager.redis:
        await manager.redis.close()

    await engine.dispose()
    logger.info("server.stopped")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Luni Cloud API",
        description="Backend server for Luni Robot ecosystem",
        version="0.1.0",
        docs_url="/api/docs" if settings.environment == "development" else None,
        redoc_url="/api/redoc" if settings.environment == "development" else None,
        openapi_url="/api/openapi.json" if settings.environment == "development" else None,
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            f"https://{settings.domain}",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request logging middleware
    from app.core.logging import LoggingMiddleware
    app.add_middleware(LoggingMiddleware)

    # Exception handlers
    register_exception_handlers(app)

    # API routes
    app.include_router(api_router, prefix="/api/v1")

    # WebSocket routes
    app.include_router(ws_device_router)
    app.include_router(ws_app_router)

    # Health check
    @app.get("/api/v1/health", tags=["health"])
    async def health():
        return {"status": "ok", "version": "0.1.0"}

    return app


# Module-level app instance for uvicorn
app = create_app()
