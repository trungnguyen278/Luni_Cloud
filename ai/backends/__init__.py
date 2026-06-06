"""Backend registry — singletons keyed by name."""

from .aimode import AIModeBackend
from .gemini import GeminiBackend
from .openai_compat import OpenAICompatBackend

aimode = AIModeBackend()
gemini = GeminiBackend()
openai_compat = OpenAICompatBackend()

registry = {
    aimode.name: aimode,
    gemini.name: gemini,
    openai_compat.name: openai_compat,
}

__all__ = ["aimode", "gemini", "openai_compat", "registry"]
