"""
Luni Server — Device business logic.

Device registration, token generation, config management.
"""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


class DeviceService:
    """Device management business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # Most device logic is handled directly in the devices API endpoints
    # for simplicity. This service exists as an extension point for
    # more complex operations (bulk updates, device provisioning flows,
    # automated config sync, etc.)

    async def get_sync_payload(self, device_id: str) -> dict:
        """
        Build the sync_data payload for a device.
        Includes: time, weather, calendar, location.
        (Phase 2: integrate with weather/calendar services)
        """
        import time

        return {
            "type": "sync_data",
            "id": "",
            "ts": int(time.time() * 1000),
            "payload": {
                "time": {
                    "unix": int(time.time()),
                    "tz": "Asia/Ho_Chi_Minh",
                    "utc_offset": 7,
                },
                "weather": None,    # Phase 2
                "calendar": None,   # Phase 2
                "location": None,   # Phase 2
            },
        }
