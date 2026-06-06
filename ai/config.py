"""
Luni AI — configuration loaded from environment variables.

All backend keys/URLs/models, the fallback order, and per-backend timeouts
come from env so nothing is hardcoded. See .env.example for the full list.
"""

import os


def _bool(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None or v.strip() == "":
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


def _int(name: str, default: int) -> int:
    v = os.getenv(name)
    if v is None or v.strip() == "":
        return default
    try:
        return int(v)
    except ValueError:
        return default


def _float(name: str, default: float) -> float:
    v = os.getenv(name)
    if v is None or v.strip() == "":
        return default
    try:
        return float(v)
    except ValueError:
        return default


def _list(name: str, default: list[str]) -> list[str]:
    v = os.getenv(name)
    if v is None or v.strip() == "":
        return list(default)
    return [x.strip() for x in v.split(",") if x.strip()]


class Settings:
    """Typed view over the container's environment."""

    def __init__(self) -> None:
        # --- Orchestration ---
        self.chat_backends = _list(
            "CHAT_BACKENDS", ["aimode", "gemini", "openai_compat"]
        )
        self.fallback_message = os.getenv(
            "CHAT_FALLBACK_MESSAGE",
            "Xin lỗi, hiện tại mình chưa kết nối được. Bạn thử lại sau một chút nhé!",
        )

        # --- PRIMARY: Google AI Mode (Playwright) ---
        self.aimode_enabled = _bool("AIMODE_ENABLED", True)
        self.aimode_url_template = os.getenv(
            "AIMODE_URL_TEMPLATE",
            "https://www.google.com/search?udm=50&hl=vi&gl=vn&q={query}",
        )
        self.aimode_timeout_ms = _int("AIMODE_TIMEOUT_MS", 8000)
        self.aimode_nav_timeout_ms = _int("AIMODE_NAV_TIMEOUT_MS", 6000)
        self.aimode_headless = _bool("AIMODE_HEADLESS", True)
        self.aimode_locale = os.getenv("AIMODE_LOCALE", "vi-VN")
        # Optional override of the answer-container selectors (comma-separated).
        # Empty -> aimode.py uses its built-in defaults.
        self.aimode_answer_selectors = _list("AIMODE_ANSWER_SELECTORS", [])

        # --- BACKUP 1: Gemini (Google AI Studio REST) ---
        self.gemini_enabled = _bool("GEMINI_ENABLED", True)
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.gemini_timeout_ms = _int("GEMINI_TIMEOUT_MS", 12000)
        self.gemini_grounding = _bool("GEMINI_GROUNDING", False)

        # --- BACKUP 2: gemma-4 (OpenAI-compatible) ---
        self.openai_compat_enabled = _bool("OPENAI_COMPAT_ENABLED", True)
        self.openai_compat_base_url = os.getenv("OPENAI_COMPAT_BASE_URL", "")
        self.openai_compat_path = os.getenv(
            "OPENAI_COMPAT_PATH", "/llm/v1/chat/completions"
        )
        self.openai_compat_token = os.getenv("OPENAI_COMPAT_TOKEN", "")
        self.openai_compat_model = os.getenv("OPENAI_COMPAT_MODEL", "gemma-4")
        self.openai_compat_max_tokens = _int("OPENAI_COMPAT_MAX_TOKENS", 512)
        self.openai_compat_temperature = _float("OPENAI_COMPAT_TEMPERATURE", 0.5)
        self.openai_compat_timeout_ms = _int("OPENAI_COMPAT_TIMEOUT_MS", 20000)

        # --- Emotion selection (LLM picks 1 of 45 keys from the reply) ---
        # "auto" | "openai_compat" | "gemini" | "heuristic"
        self.emotion_picker = os.getenv("EMOTION_PICKER", "auto")
        self.emotion_timeout_ms = _int("EMOTION_TIMEOUT_MS", 5000)

        # --- Persona / generation ---
        self.luni_max_history = _int("LUNI_MAX_HISTORY", 10)
        self.log_level = os.getenv("LOG_LEVEL", "INFO")

    def timeout_ms(self, name: str) -> int:
        """Per-backend overall timeout used by the orchestrator."""
        return {
            "aimode": self.aimode_timeout_ms,
            "gemini": self.gemini_timeout_ms,
            "openai_compat": self.openai_compat_timeout_ms,
        }.get(name, 15000)


settings = Settings()
