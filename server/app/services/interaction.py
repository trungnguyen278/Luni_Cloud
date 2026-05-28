"""
Luni Server — Interaction service (user ↔ device conversations).
"""

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Interaction


class InteractionService:
    """Manage user ↔ device interactions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def save(
        self,
        device_id: str,
        user_id: UUID | None,
        direction: str,
        source: str,
        input_text: str | None,
        output_text: str | None,
        emotion: str | None = None,
        audio_secs: float | None = None,
        latency_ms: int | None = None,
    ) -> Interaction:
        interaction = Interaction(
            device_id=device_id,
            user_id=user_id,
            direction=direction,
            source=source,
            input_text=input_text,
            output_text=output_text,
            emotion=emotion,
            audio_secs=audio_secs,
            latency_ms=latency_ms,
        )
        self.db.add(interaction)
        await self.db.flush()
        return interaction

    async def get_history(
        self,
        device_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Interaction]:
        result = await self.db.execute(
            select(Interaction)
            .where(Interaction.device_id == device_id)
            .order_by(Interaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def clear_history(self, device_id: str) -> None:
        await self.db.execute(
            delete(Interaction).where(Interaction.device_id == device_id)
        )
