import httpx
import pytest
from google.genai import errors as genai_errors

from app.core.config import settings
from app.core.exceptions import GeminiNotConfiguredError, GeminiRateLimitError, GeminiTimeoutError
from app.services import gemini_client


class _RaisingModels:
    def __init__(self, exc):
        self._exc = exc

    def generate_content(self, model, contents):
        raise self._exc


class _FakeClient:
    def __init__(self, exc):
        self.models = _RaisingModels(exc)


def _configure(monkeypatch, *, model="gemini-test-model", fallback=""):
    monkeypatch.setattr(settings, "gemini_model", model)
    monkeypatch.setattr(settings, "gemini_fallback_models", fallback)
    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")


def test_call_gemini_once_translates_httpx_read_timeout(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **kwargs: _FakeClient(httpx.ReadTimeout("timed out")))

    with pytest.raises(GeminiTimeoutError):
        gemini_client.call_gemini_once("hello", model="gemini-test-model")


def test_call_gemini_once_translates_httpx_connect_error(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **kwargs: _FakeClient(httpx.ConnectError("refused")))

    with pytest.raises(GeminiTimeoutError):
        gemini_client.call_gemini_once("hello", model="gemini-test-model")


def _api_error(code: int) -> genai_errors.APIError:
    return genai_errors.APIError(code, {"error": {"message": "boom", "status": "ERROR"}})


def test_call_gemini_once_translates_rate_limit_api_error(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **kwargs: _FakeClient(_api_error(429)))

    with pytest.raises(GeminiRateLimitError):
        gemini_client.call_gemini_once("hello", model="gemini-test-model")


@pytest.mark.parametrize("code", [408, 500, 502, 503, 504])
def test_call_gemini_once_translates_transient_server_api_errors(monkeypatch, code):
    _configure(monkeypatch)
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **kwargs: _FakeClient(_api_error(code)))

    with pytest.raises(GeminiTimeoutError):
        gemini_client.call_gemini_once("hello", model="gemini-test-model")


def test_call_gemini_once_reraises_non_transient_api_error(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **kwargs: _FakeClient(_api_error(400)))

    with pytest.raises(genai_errors.APIError):
        gemini_client.call_gemini_once("hello", model="gemini-test-model")


def test_call_gemini_once_raises_when_key_missing(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(settings, "gemini_api_key", "")

    with pytest.raises(GeminiNotConfiguredError):
        gemini_client.call_gemini_once("hello", model="gemini-test-model")


# --- model chain -----------------------------------------------------------


def test_model_chain_is_empty_when_nothing_configured(monkeypatch):
    _configure(monkeypatch, model="", fallback="")

    assert gemini_client._model_chain() == []


def test_model_chain_puts_primary_first_then_fallbacks_in_order(monkeypatch):
    _configure(monkeypatch, model="primary", fallback="fallback-a, fallback-b")

    assert gemini_client._model_chain() == ["primary", "fallback-a", "fallback-b"]


def test_model_chain_deduplicates_repeated_models(monkeypatch):
    _configure(monkeypatch, model="primary", fallback="primary,fallback-a,fallback-a")

    assert gemini_client._model_chain() == ["primary", "fallback-a"]


def test_call_gemini_raises_not_configured_when_no_model_at_all(monkeypatch):
    _configure(monkeypatch, model="", fallback="")

    with pytest.raises(GeminiNotConfiguredError):
        gemini_client.call_gemini("prompt")


# --- call_gemini: retry + backoff -------------------------------------------


def test_call_gemini_returns_result_on_first_success(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(gemini_client, "call_gemini_once", lambda prompt, *, model: "ok response")

    assert gemini_client.call_gemini("prompt") == "ok response"


def test_call_gemini_retries_on_rate_limit_then_succeeds(monkeypatch):
    _configure(monkeypatch)
    calls = {"count": 0}

    def flaky(prompt, *, model):
        calls["count"] += 1
        if calls["count"] < 2:
            raise GeminiRateLimitError("rate limited")
        return "recovered"

    monkeypatch.setattr(gemini_client, "call_gemini_once", flaky)
    monkeypatch.setattr(gemini_client.time, "sleep", lambda seconds: None)

    result = gemini_client.call_gemini("prompt")

    assert result == "recovered"
    assert calls["count"] == 2


def test_call_gemini_gives_up_after_max_retries(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(settings, "gemini_max_retries", 2)

    def always_timeout(prompt, *, model):
        raise GeminiTimeoutError("timed out")

    monkeypatch.setattr(gemini_client, "call_gemini_once", always_timeout)
    monkeypatch.setattr(gemini_client.time, "sleep", lambda seconds: None)

    with pytest.raises(GeminiTimeoutError):
        gemini_client.call_gemini("prompt")


def test_call_gemini_uses_flat_rate_limit_backoff_not_exponential(monkeypatch):
    """Rate limits need real wall-clock time to clear a per-minute quota, so
    they get a distinct, much longer, flat backoff instead of the short
    exponential curve used for timeouts."""
    _configure(monkeypatch)
    monkeypatch.setattr(settings, "gemini_max_retries", 3)
    monkeypatch.setattr(settings, "gemini_rate_limit_backoff_seconds", 20)
    sleep_calls = []
    monkeypatch.setattr(gemini_client.time, "sleep", lambda seconds: sleep_calls.append(seconds))

    def always_rate_limited(prompt, *, model):
        raise GeminiRateLimitError("rate limited")

    monkeypatch.setattr(gemini_client, "call_gemini_once", always_rate_limited)

    with pytest.raises(GeminiRateLimitError):
        gemini_client.call_gemini("prompt")

    assert sleep_calls == [20, 20]


def test_call_gemini_does_not_retry_non_transient_errors(monkeypatch):
    _configure(monkeypatch)

    def broken(prompt, *, model):
        raise ValueError("something else entirely")

    monkeypatch.setattr(gemini_client, "call_gemini_once", broken)

    with pytest.raises(ValueError):
        gemini_client.call_gemini("prompt")


# --- call_gemini: model fallback --------------------------------------------


def test_call_gemini_falls_back_to_next_model_when_primary_exhausted(monkeypatch):
    _configure(monkeypatch, model="primary", fallback="backup")
    monkeypatch.setattr(settings, "gemini_max_retries", 2)
    monkeypatch.setattr(gemini_client.time, "sleep", lambda seconds: None)

    models_tried = []

    def fake(prompt, *, model):
        models_tried.append(model)
        if model == "primary":
            raise GeminiRateLimitError("rate limited")
        return "answer from backup"

    monkeypatch.setattr(gemini_client, "call_gemini_once", fake)

    result = gemini_client.call_gemini("prompt")

    assert result == "answer from backup"
    # primary exhausted its own full retry budget before falling back
    assert models_tried == ["primary", "primary", "backup"]


def test_call_gemini_raises_last_error_when_every_model_in_chain_fails(monkeypatch):
    _configure(monkeypatch, model="primary", fallback="backup")
    monkeypatch.setattr(settings, "gemini_max_retries", 1)
    monkeypatch.setattr(gemini_client.time, "sleep", lambda seconds: None)

    def always_rate_limited(prompt, *, model):
        raise GeminiRateLimitError(f"rate limited on {model}")

    monkeypatch.setattr(gemini_client, "call_gemini_once", always_rate_limited)

    with pytest.raises(GeminiRateLimitError, match="backup"):
        gemini_client.call_gemini("prompt")


def test_call_gemini_does_not_fall_back_when_no_fallback_models_configured(monkeypatch):
    _configure(monkeypatch, model="primary", fallback="")
    monkeypatch.setattr(settings, "gemini_max_retries", 1)
    monkeypatch.setattr(gemini_client.time, "sleep", lambda seconds: None)

    models_tried = []

    def always_rate_limited(prompt, *, model):
        models_tried.append(model)
        raise GeminiRateLimitError("rate limited")

    monkeypatch.setattr(gemini_client, "call_gemini_once", always_rate_limited)

    with pytest.raises(GeminiRateLimitError):
        gemini_client.call_gemini("prompt")

    assert models_tried == ["primary"]
