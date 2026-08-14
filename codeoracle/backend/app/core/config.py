from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
GENERATED_DIR = BASE_DIR / "generated"


class Settings(BaseSettings):
    """Central app configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Server
    host: str = "127.0.0.1"
    port: int = 8000

    # CORS - comma-separated list of allowed frontend origins
    frontend_origins: str = "http://localhost:5173"

    # Gemini API (used starting in Backend Phase 6)
    gemini_api_key: str = ""
    gemini_model: str = ""
    gemini_timeout_seconds: float = 30.0
    gemini_max_retries: int = 3
    gemini_retry_base_seconds: float = 1.0
    gemini_rate_limit_backoff_seconds: float = 20.0
    gemini_max_concurrency: int = 2

    # Upload / processing limits
    max_upload_mb: int = 20
    max_extracted_mb: int = 50
    max_files: int = 1000
    max_source_lines: int = 10000
    max_file_bytes: int = 500000
    job_ttl_minutes: int = 60

    @property
    def frontend_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
