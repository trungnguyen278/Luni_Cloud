"""
Luni Server — Log ingestion and query service.
"""

from datetime import datetime

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError
from app.db.models import Device, DeviceLog, DeviceShare, ServerLog, User
from app.schemas.log import LEVEL_MAP, DeviceLogSchema

logger = structlog.get_logger()


class LogService:
    """Device and server log management."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def ingest_device_log(
        self, device_id: str, log: DeviceLogSchema
    ) -> None:
        """Save device log to DB if it meets the device's log level threshold."""
        # Get device config for log level
        result = await self.db.execute(
            select(Device.config).where(Device.id == device_id)
        )
        config = result.scalar_one_or_none()
        device_log_level = "info"
        if config:
            device_log_level = config.get("log_level", "info")

        # Only store if log level meets threshold
        if log.level_num >= LEVEL_MAP.get(device_log_level, 20):
            db_log = DeviceLog(
                device_id=device_id,
                source="device",
                level=log.level,
                tag=log.tag,
                message=log.message,
                metadata_=log.metadata,
            )
            self.db.add(db_log)
            await self.db.flush()

    async def query_logs(
        self,
        user: User,
        device_id: str | None = None,
        level: str | None = None,
        tag: str | None = None,
        from_dt: str | None = None,
        to_dt: str | None = None,
        limit: int = 50,
        offset: int = 0,
        admin_mode: bool = False,
    ) -> list[DeviceLog]:
        """Query device logs with filters and access control."""
        query = select(DeviceLog)

        if device_id:
            # Verify access unless admin
            if not admin_mode and user.role != "admin":
                await self._check_device_access(device_id, user)
            query = query.where(DeviceLog.device_id == device_id)

        elif not admin_mode:
            # Non-admin without device_id: only show own devices
            owned_ids = await self._get_user_device_ids(user)
            query = query.where(DeviceLog.device_id.in_(owned_ids))

        if level:
            query = query.where(DeviceLog.level == level)
        if tag:
            query = query.where(DeviceLog.tag == tag)
        if from_dt:
            query = query.where(
                DeviceLog.created_at >= datetime.fromisoformat(from_dt)
            )
        if to_dt:
            query = query.where(
                DeviceLog.created_at <= datetime.fromisoformat(to_dt)
            )

        query = query.order_by(DeviceLog.created_at.desc())
        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def query_user_logs(
        self,
        user: User,
        level: str | None = None,
        tag: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[DeviceLog]:
        """Query logs for all devices owned by the user."""
        device_ids = await self._get_user_device_ids(user)

        query = select(DeviceLog).where(DeviceLog.device_id.in_(device_ids))

        if level:
            query = query.where(DeviceLog.level == level)
        if tag:
            query = query.where(DeviceLog.tag == tag)

        query = query.order_by(DeviceLog.created_at.desc())
        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _get_user_device_ids(self, user: User) -> list[str]:
        """Get all device IDs the user owns or has access to."""
        # Owned
        owned = await self.db.execute(
            select(Device.id).where(Device.owner_id == user.id)
        )
        ids = [row[0] for row in owned.all()]

        # Shared
        shared = await self.db.execute(
            select(DeviceShare.device_id).where(DeviceShare.user_id == user.id)
        )
        ids.extend(row[0] for row in shared.all())

        return ids

    async def query_server_logs(
        self,
        level: str | None = None,
        module: str | None = None,
        request_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ServerLog]:
        """Query server logs (admin only)."""
        query = select(ServerLog)

        if level:
            query = query.where(ServerLog.level == level)
        if module:
            query = query.where(ServerLog.module == module)
        if request_id:
            import uuid
            query = query.where(ServerLog.request_id == uuid.UUID(request_id))

        query = query.order_by(ServerLog.created_at.desc())
        query = query.limit(limit).offset(offset)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _check_device_access(self, device_id: str, user: User) -> None:
        """Check if user has access to device (owner or shared)."""
        result = await self.db.execute(
            select(Device).where(Device.id == device_id)
        )
        device = result.scalar_one_or_none()

        if not device:
            raise ForbiddenError("Device not found")

        if device.owner_id == user.id:
            return

        share = await self.db.execute(
            select(DeviceShare).where(
                DeviceShare.device_id == device_id,
                DeviceShare.user_id == user.id,
            )
        )
        if not share.scalar_one_or_none():
            raise ForbiddenError("No access to this device")
