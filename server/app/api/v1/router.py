"""
Luni Server — V1 API Router Aggregator.

Collects all v1 sub-routers into a single router.
"""

from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.data import router as data_router
from app.api.v1.devices import router as devices_router
from app.api.v1.firmware import router as firmware_router
from app.api.v1.interactions import router as interactions_router
from app.api.v1.logs import router as logs_router
from app.api.v1.ota import router as ota_router
from app.api.v1.push import router as push_router
from app.api.v1.stats import router as stats_router
from app.api.v1.users import router as users_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(devices_router, prefix="/devices", tags=["devices"])
api_router.include_router(data_router, prefix="/data", tags=["data"])
api_router.include_router(interactions_router, tags=["interactions"])
api_router.include_router(ota_router, tags=["ota"])
api_router.include_router(firmware_router, tags=["firmware"])
api_router.include_router(stats_router, tags=["stats"])
api_router.include_router(push_router, tags=["push"])
api_router.include_router(users_router, prefix="/admin/users", tags=["admin-users"])
api_router.include_router(logs_router, tags=["logs"])
api_router.include_router(admin_router, tags=["admin"])
