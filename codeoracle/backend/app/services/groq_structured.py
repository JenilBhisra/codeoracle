import json
import logging
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from app.core.exceptions import CodeOracleError
from app.services.groq_client import call_groq

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


def _extract_json_block(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text[:4].lower() == "json":
            text = text[4:]
    return text.strip()


def _try_parse(raw: str, response_model: type[T]) -> tuple[T | None, str | None]:
    cleaned = _extract_json_block(raw)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        return None, f"invalid JSON ({exc})"
    try:
        return response_model.model_validate(data), None
    except ValidationError as exc:
        return None, f"response did not match expected schema ({exc.error_count()} validation error(s))"


def generate_structured(prompt: str, response_model: type[T]) -> tuple[T | None, str | None]:
    """Call Groq and parse+validate the response as `response_model`.

    Never raises for AI-side failures (missing config, rate limit, timeout,
    invalid JSON) - always returns (None, warning) instead, so a flaky or
    misconfigured Groq call degrades one optional step rather than taking
    down the whole job.
    """
    try:
        raw = call_groq(prompt)
    except CodeOracleError as exc:
        return None, f"Groq call failed: {exc.message}"

    parsed, error = _try_parse(raw, response_model)
    if parsed is not None:
        return parsed, None

    repair_prompt = (
        f"{prompt}\n\n"
        f"Your previous response could not be used ({error}). "
        "Reply again with ONLY valid JSON matching the schema above - no "
        "markdown formatting, no extra text before or after the JSON."
    )
    try:
        raw_retry = call_groq(repair_prompt)
    except CodeOracleError as exc:
        return None, f"Groq call failed: {exc.message}"

    parsed, error = _try_parse(raw_retry, response_model)
    if parsed is not None:
        return parsed, None

    warning = f"Groq returned invalid JSON that could not be repaired: {error}"
    logger.warning(warning)
    return None, warning
