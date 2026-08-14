import json
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
GENERATED_DIR = BASE_DIR / "generated"

# Zero-width/invisible characters that can silently ride along when a value is
# pasted into a web form (e.g. a dashboard env-var field) - str.strip() alone
# does not remove these, and a stray one is invisible in a screenshot but
# still breaks CORSMiddleware's exact string match against the Origin header.
_INVISIBLE_CHARS = "​‌‍﻿ "


def _normalize_origin(origin: str) -> str:
    origin = origin.strip().strip(_INVISIBLE_CHARS)
    # Browsers never include a trailing slash in the Origin header they send,
    # so one left in config would otherwise cause a silent, exact-match miss.
    return origin.rstrip("/")


def _parse_origin_list(raw: str) -> list[str]:
    """Parse an origins setting as either a JSON array or a comma-separated string."""
    raw = raw.strip()
    if raw.startswith("["):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = []
        if isinstance(parsed, list):
            return [_normalize_origin(str(item)) for item in parsed if str(item).strip()]
        return []

    return [_normalize_origin(origin) for origin in raw.split(",") if origin.strip()]


# Always allowed regardless of FRONTEND_ORIGINS - local dev origins plus the
# production frontend, so a missing, mistyped, or otherwise misconfigured env
# var can never fully lock the real frontend out of the API.
_ALWAYS_TRUSTED_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://codeoracle-zeta.vercel.app",
)


def _effective_origins(raw: str) -> list[str]:
    """Configured origins plus the always-trusted set, deduplicated and order-preserving."""
    deduped: list[str] = []
    for origin in [*_parse_origin_list(raw), *_ALWAYS_TRUSTED_ORIGINS]:
        if origin and origin not in deduped:
            deduped.append(origin)
    return deduped


class Settings(BaseSettings):
    """Central app configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Server
    host: str = "127.0.0.1"
    port: int = 8000

    # CORS - comma-separated list of allowed frontend origins
    frontend_origins: str = "http://localhost:5173"

    # Groq API (used starting in Backend Phase 6)
    groq_api_key: str = ""
    groq_model: str = ""
    # Comma-separated models tried in order if groq_model is exhausted/unavailable -
    # different models have independent rate-limit quotas, so falling back to another
    # one can keep a demo working even if the primary model's quota is spent.
    groq_fallback_models: str = ""
    groq_timeout_seconds: float = 30.0
    groq_max_retries: int = 3
    groq_retry_base_seconds: float = 1.0
    groq_rate_limit_backoff_seconds: float = 20.0
    groq_max_concurrency: int = 2

    # Upload / processing limits
    max_upload_mb: int = 20
    max_extracted_mb: int = 50
    max_files: int = 1000
    max_source_lines: int = 10000
    max_file_bytes: int = 500000
    job_ttl_minutes: int = 60

    @property
    def frontend_origins_list(self) -> list[str]:
        return _effective_origins(self.frontend_origins)

    @property
    def groq_fallback_models_list(self) -> list[str]:
        return [model.strip() for model in self.groq_fallback_models.split(",") if model.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
