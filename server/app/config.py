"""
Luni Server — Application Settings.

Reads configuration from environment variables using pydantic-settings.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # === Server ===
    domain: str = "localhost"
    secret_key: str = "change-me-in-production"
    log_level: str = "info"
    environment: str = "development"

    # === Database ===
    database_url: str = "postgresql+asyncpg://luni:password@db:5432/luni"

    # === Redis ===
    redis_url: str = "redis://redis:6379/0"

    # === Cloudflare R2 ===
    cf_r2_account_id: str = ""
    cf_r2_access_key: str = ""
    cf_r2_secret_key: str = ""
    cf_r2_bucket: str = "luni-firmware"

    # === AI Container (Phase 2) ===
    ai_service_url: str = "http://ai:8081"
    stt_language: str = "vi"
    max_interaction_length: int = 2000
    max_audio_duration: int = 30

    # === External Data ===
    openweather_api_key: str = ""

    # === Sync Data ===
    weather_sync_interval_minutes: int = 15
    weather_cache_ttl_seconds: int = 1200
    calendar_cache_ttl_seconds: int = 86400
    sync_cache_ttl_seconds: int = 1200

    # === JWT ===
    jwt_access_expire_minutes: int = 60
    jwt_refresh_expire_days: int = 30

    @property
    def r2_endpoint_url(self) -> str:
        """Cloudflare R2 S3-compatible endpoint."""
        return f"https://{self.cf_r2_account_id}.r2.cloudflarestorage.com"


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
