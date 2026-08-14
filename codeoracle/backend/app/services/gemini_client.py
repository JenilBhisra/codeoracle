import logging
import threading
import time

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types

from app.core.config import settings
from app.core.exceptions import GeminiNotConfiguredError, GeminiRateLimitError, GeminiTimeoutError

logger = logging.getLogger(__name__)

_RATE_LIMIT_CODE = 429
# 408/504 are literal timeouts; 500/502/503 are Gemini-side server errors
# that are also transient by nature (Gemini's own 503 message says as much:
# "usually temporary... please try again later") - all treated as retryable.
_TRANSIENT_SERVER_CODES = {408, 500, 502, 503, 504}

_semaphore = threading.Semaphore(settings.gemini_max_concurrency)


def _build_client() -> genai.Client:
    if not settings.gemini_api_key:
        raise GeminiNotConfiguredError("GEMINI_API_KEY is not set.")
    return genai.Client(
        api_key=settings.gemini_api_key,
        http_options=genai_types.HttpOptions(timeout=int(settings.gemini_timeout_seconds * 1000)),
    )


def _model_chain() -> list[str]:
    """Primary model first, then fallbacks, de-duplicated but order-preserved."""
    models = [settings.gemini_model] if settings.gemini_model else []
    for model in settings.gemini_fallback_models_list:
        if model not in models:
            models.append(model)
    return models


def call_gemini_once(prompt: str, *, model: str) -> str:
    """The only function that actually talks to the Gemini API.

    Kept tiny and isolated so tests can monkeypatch this single function
    instead of mocking the SDK's client/response objects.
    """
    client = _build_client()
    try:
        response = client.models.generate_content(model=model, contents=prompt)
    except genai_errors.APIError as exc:
        if exc.code == _RATE_LIMIT_CODE:
            raise GeminiRateLimitError("Gemini rate limit reached. Please try again later.") from exc
        if exc.code in _TRANSIENT_SERVER_CODES:
            raise GeminiTimeoutError("Gemini is temporarily unavailable.") from exc
        raise
    except httpx.HTTPError as exc:
        # Transport-level failures (read timeout, connection reset, DNS) never
        # reach the SDK's response parsing, so they surface as raw httpx
        # exceptions rather than genai_errors.APIError. Treated the same as a
        # Gemini-side timeout so call_gemini retries them instead of letting
        # them crash the whole job.
        raise GeminiTimeoutError("Network error while calling Gemini.") from exc

    return response.text or ""


def call_gemini(prompt: str) -> str:
    """Rate-limited, retrying, model-falling-back entry point - use this everywhere else.

    Limits concurrent in-flight requests with a semaphore (free-tier
    friendly) and retries transient failures before giving up. Rate limits
    (429) get a much longer, flat backoff than timeouts/5xx errors, since a
    per-minute quota needs real wall-clock time to reset - the short
    exponential backoff used for timeouts (a couple of seconds) never gives
    a rate limit window a chance to clear, so every retry just fails the
    same way again.

    If GEMINI_FALLBACK_MODELS is set, each model gets its own full retry
    budget before moving to the next one: different models draw from
    independent quotas, so a model whose daily quota is genuinely exhausted
    (not just mid-minute) can be swapped out for one that still has headroom,
    instead of every call failing identically for the rest of the day.
    """
    models = _model_chain()
    if not models:
        raise GeminiNotConfiguredError("GEMINI_MODEL is not set.")

    last_exc: Exception | None = None
    for index, model in enumerate(models):
        for attempt in range(settings.gemini_max_retries):
            try:
                with _semaphore:
                    return call_gemini_once(prompt, model=model)
            except GeminiRateLimitError as exc:
                last_exc = exc
                if attempt < settings.gemini_max_retries - 1:
                    time.sleep(settings.gemini_rate_limit_backoff_seconds)
            except GeminiTimeoutError as exc:
                last_exc = exc
                if attempt < settings.gemini_max_retries - 1:
                    time.sleep(settings.gemini_retry_base_seconds * (2**attempt))

        if index < len(models) - 1:
            logger.warning(
                "Model %s exhausted after %d attempts, falling back to %s",
                model,
                settings.gemini_max_retries,
                models[index + 1],
            )

    assert last_exc is not None
    raise last_exc
