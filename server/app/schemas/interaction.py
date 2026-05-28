"""
Luni Server — Interaction schemas.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class InteractRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    source: str = Field(default="web", pattern=r"^(app|web)$")


class InteractResponse(BaseModel):
    input: str
    output: str
    emotion: str
    latency_ms: int
    interaction_id: int


class InteractionResponse(BaseModel):
    id: int
    device_id: str
    user_id: UUID | None = None
    direction: str
    source: str
    input_text: str | None = None
    output_text: str | None = None
    emotion: str | None = None
    audio_secs: float | None = None
    latency_ms: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
