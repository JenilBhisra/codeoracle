import copy
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

# Only these models currently support response_format={"type": "json_schema"}
# (verified against https://console.groq.com/docs/structured-outputs - this
# list will need updating as Groq adds support to more models). Every other
# model falls back to the looser {"type": "json_object"} mode, which
# guarantees valid JSON syntax but not schema conformance - that's what the
# repair-retry pass in groq_structured.py exists to catch.
_STRICT_SCHEMA_MODELS = {"openai/gpt-oss-120b", "openai/gpt-oss-20b", "openai/gpt-oss-safeguard-20b"}

_semaphore = threading.Semaphore(settings.groq_max_concurrency)


def _strictify_schema(schema: dict) -> dict:
    """Adapt a Pydantic-generated JSON schema for Groq/OpenAI strict mode.

    Strict mode requires every object to set `additionalProperties: false`
    and list every one of its properties as `required` - Pydantic only marks
    fields without defaults as required, so an unmodified model_json_schema()
    output gets rejected. This doesn't change what's optional on the Python
    side: forcing a field "required" here just means the model can't omit
    the key, not that the field stops having a sensible default in Python.

    Free-form maps (dict[str, X] fields, schema'd as an object with
    `additionalProperties` set to a type rather than a fixed `properties`
    list) aren't supported by strict mode at all and need a different Python
    type (e.g. a list of {name, value} objects) - this function can't paper
    over that; the model must not define such a field to use strict mode.
    """
    schema = copy.deepcopy(schema)

    def walk(node: object) -> None:
        if not isinstance(node, dict):
            return
        if "properties" in node:
            node["required"] = list(node["properties"].keys())
            node["additionalProperties"] = False
            for value in node["properties"].values():
                walk(value)
        for key in ("$defs", "definitions"):
            if key in node:
                for value in node[key].values():
                    walk(value)
        if "items" in node:
            walk(node["items"])
        for key in ("anyOf", "oneOf", "allOf"):
            if key in node:
                for value in node[key]:
                    walk(value)

    walk(schema)
    return schema


def _response_format(model: str, *, schema_name: str, schema: dict) -> dict:
    if model in _STRICT_SCHEMA_MODELS:
        return {
            "type": "json_schema",
            "json_schema": {"name": schema_name, "schema": _strictify_schema(schema), "strict": True},
        }
    return {"type": "json_object"}


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


def call_groq_once(prompt: str, *, model: str, schema_name: str | None = None, schema: dict | None = None) -> str:
    """The only function that actually talks to the Groq API.

    Kept tiny and isolated so tests can monkeypatch this single function
    instead of mocking the SDK's client/response objects. When schema_name/
    schema are given and the model supports it, requests are constrained to
    that exact JSON shape server-side; otherwise falls back to best-effort
    JSON mode.
    """
    client = _build_client()
    if schema_name and schema is not None:
        response_format = _response_format(model, schema_name=schema_name, schema=schema)
    else:
        response_format = {"type": "json_object"}

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format=response_format,
        )
    except groq.RateLimitError as exc:
        raise GroqRateLimitError("Groq rate limit reached. Please try again later.") from exc
    except _TRANSIENT_ERRORS as exc:
        raise GroqTimeoutError("Groq is temporarily unavailable.") from exc

    return response.choices[0].message.content or ""


def call_groq(prompt: str, *, schema_name: str | None = None, schema: dict | None = None) -> str:
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
                    return call_groq_once(prompt, model=model, schema_name=schema_name, schema=schema)
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
