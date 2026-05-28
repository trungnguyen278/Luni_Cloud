"""
Luni Server — Log API endpoints.

Device logs, server logs, admin log management.
"""

import logging

import structlog
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_admin
from app.db.models import User
from app.schemas.log import LogLevelSchema, LogQuery, LogResponse, ServerLogResponse
from app.services.log_service import LogService

logger = structlog.get_logger()

router = APIRouter()


@router.get("/devices/{device_id}/logs", response_model=list[LogResponse])
async def get_device_logs(
    device_id: str,
    level: str | None = Query(None),
    tag: str | None = Query(None),
    from_dt: str | None = Query(None),
    to_dt: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get logs for a specific device."""
    service = LogService(db)

    # Access check is handled inside service
    return await service.query_logs(
        device_id=device_id,
        user=user,
        level=level,
        tag=tag,
        from_dt=from_dt,
        to_dt=to_dt,
        limit=limit,
        offset=offset,
    )


@router.get("/logs", response_model=list[LogResponse])
async def get_my_logs(
    level: str | None = Query(None),
    tag: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get logs for all of the current user's devices."""
    service = LogService(db)
    return await service.query_user_logs(
        user=user,
        level=level,
        tag=tag,
        limit=limit,
        offset=offset,
    )


# === Admin endpoints ===


@router.get("/admin/logs/devices", response_model=list[LogResponse])
async def admin_get_all_device_logs(
    device_id: str | None = Query(None),
    level: str | None = Query(None),
    tag: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get all device logs — any device (admin only)."""
    service = LogService(db)
    return await service.query_logs(
        device_id=device_id,
        user=admin,
        level=level,
        tag=tag,
        limit=limit,
        offset=offset,
        admin_mode=True,
    )


@router.get("/admin/logs/server", response_model=list[ServerLogResponse])
async def admin_get_server_logs(
    level: str | None = Query(None),
    module: str | None = Query(None),
    request_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Query server (FastAPI) logs — admin only."""
    service = LogService(db)
    return await service.query_server_logs(
        level=level,
        module=module,
        request_id=request_id,
        limit=limit,
        offset=offset,
    )


@router.post("/admin/logs/config")
async def set_server_log_level(
    body: LogLevelSchema,
    admin: User = Depends(require_admin),
):
    """Change server log level at runtime (no restart needed)."""
    new_level = getattr(logging, body.level.upper())
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(new_level)
    )
    logger.info(
        "server.log_level_changed",
        new_level=body.level,
        by=admin.email,
    )
    return {"status": "ok", "level": body.level}
