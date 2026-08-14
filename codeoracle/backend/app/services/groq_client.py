import logging
import threading
import time

import groq

from app.core.config import settings
from app.core.exceptions import GroqNotConfiguredError, GroqRateLimitError, GroqTimeoutError

logger = logging.getLogger(__name__)

# Network-level failures (never got a response) and 5xx server errors are
# both transient - Groq's own SDK already distinguishes these from
# non-retryable client errors (bad request, auth, not found) via distinct
# exception classes, so no manual status-code inspection is needed here.
_TRANSIENT_ERRORS = (groq.APIConnectionError, groq.APITimeoutError, groq.InternalServerError)

_semaphore = threading.Semaphore(settings.groq_max_concurrency)


def _build_client() -> groq.Groq:
    if not settings.groq_api_key:
        raise GroqNotConfiguredError("GROQ_API_KEY is not set.")
    return groq.Groq(api_key=settings.groq_api_key, timeout=settings.groq_timeout_seconds)


def _model_chain() -> list[str]:
    """Primary model first, then fallbacks, de-duplicated but order-preserved."""
    models = [settings.groq_model] if settings.groq_model else []
    for model in settings.groq_fallback_models_list:
        if model not in models:
            models.append(model)
    return models


def call_groq_once(prompt: str, *, model: str) -> str:
    """The only function that actually talks to the Groq API.

    Kept tiny and isolated so tests can monkeypatch this single function
    instead of mocking the SDK's client/response objects.
    """
    client = _build_client()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
    except groq.RateLimitError as exc:
        raise GroqRateLimitError("Groq rate limit reached. Please try again later.") from exc
    except _TRANSIENT_ERRORS as exc:
        raise GroqTimeoutError("Groq is temporarily unavailable.") from exc

    return response.choices[0].message.content or ""


def call_groq(prompt: str) -> str:
    """Rate-limited, retrying, model-falling-back entry point - use this everywhere else.

    Limits concurrent in-flight requests with a semaphore and retries
    transient failures before giving up. Rate limits get a much longer, flat
    backoff than timeouts/5xx errors, since a per-minute quota needs real
    wall-clock time to reset - the short exponential backoff used for
    timeouts (a couple of seconds) never gives a rate limit window a chance
    to clear, so every retry just fails the same way again.

    If GROQ_FALLBACK_MODELS is set, each model gets its own full retry
    budget before moving to the next one: different models draw from
    independent quotas, so a model whose quota is genuinely exhausted can be
    swapped out for one that still has headroom, instead of every call
    failing identically for the rest of the day.
    """
    models = _model_chain()
    if not models:
        raise GroqNotConfiguredError("GROQ_MODEL is not set.")

    last_exc: Exception | None = None
    for index, model in enumerate(models):
        for attempt in range(settings.groq_max_retries):
            try:
                with _semaphore:
                    return call_groq_once(prompt, model=model)
            except GroqRateLimitError as exc:
                last_exc = exc
                if attempt < settings.groq_max_retries - 1:
                    time.sleep(settings.groq_rate_limit_backoff_seconds)
            except GroqTimeoutError as exc:
                last_exc = exc
                if attempt < settings.groq_max_retries - 1:
                    time.sleep(settings.groq_retry_base_seconds * (2**attempt))

        if index < len(models) - 1:
            logger.warning(
                "Model %s exhausted after %d attempts, falling back to %s",
                model,
                settings.groq_max_retries,
                models[index + 1],
            )

    assert last_exc is not None
    raise last_exc
