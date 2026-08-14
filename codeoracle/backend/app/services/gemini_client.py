import threading
import time

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types

from app.core.config import settings
from app.core.exceptions import GeminiNotConfiguredError, GeminiRateLimitError, GeminiTimeoutError

_RATE_LIMIT_CODE = 429
_TIMEOUT_CODES = {408, 504}

_semaphore = threading.Semaphore(settings.gemini_max_concurrency)


def _build_client() -> genai.Client:
    if not settings.gemini_api_key:
        raise GeminiNotConfiguredError("GEMINI_API_KEY is not set.")
    return genai.Client(
        api_key=settings.gemini_api_key,
        http_options=genai_types.HttpOptions(timeout=int(settings.gemini_timeout_seconds * 1000)),
    )


def call_gemini_once(prompt: str) -> str:
    """The only function that actually talks to the Gemini API.

    Kept tiny and isolated so tests can monkeypatch this single function
    instead of mocking the SDK's client/response objects.
    """
    if not settings.gemini_model:
        raise GeminiNotConfiguredError("GEMINI_MODEL is not set.")

    client = _build_client()
    try:
        response = client.models.generate_content(model=settings.gemini_model, contents=prompt)
    except genai_errors.APIError as exc:
        if exc.code == _RATE_LIMIT_CODE:
            raise GeminiRateLimitError("Gemini rate limit reached. Please try again later.") from exc
        if exc.code in _TIMEOUT_CODES:
            raise GeminiTimeoutError("Timed out while calling Gemini.") from exc
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
    """Rate-limited, retrying entry point - use this everywhere else.

    Limits concurrent in-flight requests with a semaphore (free-tier
    friendly) and retries transient rate-limit/timeout failures with
    exponential backoff before giving up.
    """
    last_exc: Exception | None = None
    for attempt in range(settings.gemini_max_retries):
        try:
            with _semaphore:
                return call_gemini_once(prompt)
        except (GeminiRateLimitError, GeminiTimeoutError) as exc:
            last_exc = exc
            if attempt < settings.gemini_max_retries - 1:
                time.sleep(settings.gemini_retry_base_seconds * (2**attempt))

    assert last_exc is not None
    raise last_exc
