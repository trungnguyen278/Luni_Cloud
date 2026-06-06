"""
Backend interface.

Every chat backend returns PLAIN TEXT only. Emotion is inferred uniformly by the
orchestrator (see emotion.py), so AI Mode — which can't produce structured
output — is handled identically to the LLM backends.
"""

from typing import Protocol


class ChatBackend(Protocol):
    name: str
    enabled: bool

    async def chat(self, message: str, context, history) -> str:
        """Return the assistant reply as plain text, or raise on failure."""
        ...
