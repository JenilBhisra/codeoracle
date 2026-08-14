import groq
import httpx
import pytest

from app.core.config import settings
from app.core.exceptions import GroqNotConfiguredError, GroqRateLimitError, GroqTimeoutError
from app.services import groq_client


class _RaisingCompletions:
    def __init__(self, exc):
        self._exc = exc

    def create(self, **kwargs):
        raise self._exc


class _FakeChat:
    def __init__(self, exc):
        self.completions = _RaisingCompletions(exc)


class _FakeClient:
    def __init__(self, exc):
        self.chat = _FakeChat(exc)


def _configure(monkeypatch, *, model="groq-test-model", fallback=""):
    monkeypatch.setattr(settings, "groq_model", model)
    monkeypatch.setattr(settings, "groq_fallback_models", fallback)
    monkeypatch.setattr(settings, "groq_api_key", "fake-key")


_FAKE_REQUEST = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")


def _status_error(cls, code: int):
    response = httpx.Response(code, request=_FAKE_REQUEST)
    return cls("boom", response=response, body=None)


def test_call_groq_once_translates_api_connection_error(monkeypatch):
    _configure(monkeypatch)
    exc = groq.APIConnectionError(request=_FAKE_REQUEST)
    monkeypatch.setattr(groq_client.groq, "Groq", lambda **kwargs: _FakeClient(exc))

    with pytest.raises(GroqTimeoutError):
        groq_client.call_groq_once("hello", model="groq-test-model")


def test_call_groq_once_translates_api_timeout_error(monkeypatch):
    _configure(monkeypatch)
    exc = groq.APITimeoutError(request=_FAKE_REQUEST)
    monkeypatch.setattr(groq_client.groq, "Groq", lambda **kwargs: _FakeClient(exc))

    with pytest.raises(GroqTimeoutError):
        groq_client.call_groq_once("hello", model="groq-test-model")


def test_call_groq_once_translates_rate_limit_error(monkeypatch):
    _configure(monkeypatch)
    exc = _status_error(groq.RateLimitError, 429)
    monkeypatch.setattr(groq_client.groq, "Groq", lambda **kwargs: _FakeClient(exc))

    with pytest.raises(GroqRateLimitError):
        groq_client.call_groq_once("hello", model="groq-test-model")


def test_call_groq_once_translates_internal_server_error(monkeypatch):
    _configure(monkeypatch)
    exc = _status_error(groq.InternalServerError, 503)
    monkeypatch.setattr(groq_client.groq, "Groq", lambda **kwargs: _FakeClient(exc))

    with pytest.raises(GroqTimeoutError):
        groq_client.call_groq_once("hello", model="groq-test-model")


def test_call_groq_once_reraises_non_transient_error(monkeypatch):
    _configure(monkeypatch)
    exc = _status_error(groq.BadRequestError, 400)
    monkeypatch.setattr(groq_client.groq, "Groq", lambda **kwargs: _FakeClient(exc))

    with pytest.raises(groq.BadRequestError):
        groq_client.call_groq_once("hello", model="groq-test-model")


def test_call_groq_once_raises_when_key_missing(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(settings, "groq_api_key", "")

    with pytest.raises(GroqNotConfiguredError):
        groq_client.call_groq_once("hello", model="groq-test-model")


# --- model chain -------------------------------------------------------------


def test_model_chain_is_empty_when_nothing_configured(monkeypatch):
    _configure(monkeypatch, model="", fallback="")

    assert groq_client._model_chain() == []


def test_model_chain_puts_primary_first_then_fallbacks_in_order(monkeypatch):
    _configure(monkeypatch, model="primary", fallback="fallback-a, fallback-b")

    assert groq_client._model_chain() == ["primary", "fallback-a", "fallback-b"]


def test_model_chain_deduplicates_repeated_models(monkeypatch):
    _configure(monkeypatch, model="primary", fallback="primary,fallback-a,fallback-a")

    assert groq_client._model_chain() == ["primary", "fallback-a"]


def test_call_groq_raises_not_configured_when_no_model_at_all(monkeypatch):
    _configure(monkeypatch, model="", fallback="")

    with pytest.raises(GroqNotConfiguredError):
        groq_client.call_groq("prompt")


# --- call_groq: retry + backoff -----------------------------------------------


def test_call_groq_returns_result_on_first_success(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(groq_client, "call_groq_once", lambda prompt, *, model: "ok response")

    assert groq_client.call_groq("prompt") == "ok response"


def test_call_groq_retries_on_rate_limit_then_succeeds(monkeypatch):
    _configure(monkeypatch)
    calls = {"count": 0}

    def flaky(prompt, *, model):
        calls["count"] += 1
        if calls["count"] < 2:
            raise GroqRateLimitError("rate limited")
        return "recovered"

    monkeypatch.setattr(groq_client, "call_groq_once", flaky)
    monkeypatch.setattr(groq_client.time, "sleep", lambda seconds: None)

    result = groq_client.call_groq("prompt")

    assert result == "recovered"
    assert calls["count"] == 2


def test_call_groq_gives_up_after_max_retries(monkeypatch):
    _configure(monkeypatch)
    monkeypatch.setattr(settings, "groq_max_retries", 2)

    def always_timeout(prompt, *, model):
        raise GroqTimeoutError("timed out")

    monkeypatch.setattr(groq_client, "call_groq_once", always_timeout)
    monkeypatch.setattr(groq_client.time, "sleep", lambda seconds: None)

    with pytest.raises(GroqTimeoutError):
        groq_client.call_groq("prompt")


def test_call_groq_uses_flat_rate_limit_backoff_not_exponential(monkeypatch):
    """Rate limits need real wall-clock time to clear a per-minute quota, so
    they get a distinct, much longer, flat backoff instead of the short
    exponential curve used for timeouts."""
    _configure(monkeypatch)
    monkeypatch.setattr(settings, "groq_max_retries", 3)
    monkeypatch.setattr(settings, "groq_rate_limit_backoff_seconds", 20)
    sleep_calls = []
    monkeypatch.setattr(groq_client.time, "sleep", lambda seconds: sleep_calls.append(seconds))

    def always_rate_limited(prompt, *, model):
        raise GroqRateLimitError("rate limited")

    monkeypatch.setattr(groq_client, "call_groq_once", always_rate_limited)

    with pytest.raises(GroqRateLimitError):
        groq_client.call_groq("prompt")

    assert sleep_calls == [20, 20]


def test_call_groq_does_not_retry_non_transient_errors(monkeypatch):
    _configure(monkeypatch)

    def broken(prompt, *, model):
        raise ValueError("something else entirely")

    monkeypatch.setattr(groq_client, "call_groq_once", broken)

    with pytest.raises(ValueError):
        groq_client.call_groq("prompt")


# --- call_groq: model fallback -------------------------------------------------


def test_call_groq_falls_back_to_next_model_when_primary_exhausted(monkeypatch):
    _configure(monkeypatch, model="primary", fallback="backup")
    monkeypatch.setattr(settings, "groq_max_retries", 2)
    monkeypatch.setattr(groq_client.time, "sleep", lambda seconds: None)

    models_tried = []

    def fake(prompt, *, model):
        models_tried.append(model)
        if model == "primary":
            raise GroqRateLimitError("rate limited")
        return "answer from backup"

    monkeypatch.setattr(groq_client, "call_groq_once", fake)

    result = groq_client.call_groq("prompt")

    assert result == "answer from backup"
    # primary exhausted its own full retry budget before falling back
    assert models_tried == ["primary", "primary", "backup"]


def test_call_groq_raises_last_error_when_every_model_in_chain_fails(monkeypatch):
    _configure(monkeypatch, model="primary", fallback="backup")
    monkeypatch.setattr(settings, "groq_max_retries", 1)
    monkeypatch.setattr(groq_client.time, "sleep", lambda seconds: None)

    def always_rate_limited(prompt, *, model):
        raise GroqRateLimitError(f"rate limited on {model}")

    monkeypatch.setattr(groq_client, "call_groq_once", always_rate_limited)

    with pytest.raises(GroqRateLimitError, match="backup"):
        groq_client.call_groq("prompt")


def test_call_groq_does_not_fall_back_when_no_fallback_models_configured(monkeypatch):
    _configure(monkeypatch, model="primary", fallback="")
    monkeypatch.setattr(settings, "groq_max_retries", 1)
    monkeypatch.setattr(groq_client.time, "sleep", lambda seconds: None)

    models_tried = []

    def always_rate_limited(prompt, *, model):
        models_tried.append(model)
        raise GroqRateLimitError("rate limited")

    monkeypatch.setattr(groq_client, "call_groq_once", always_rate_limited)

    with pytest.raises(GroqRateLimitError):
        groq_client.call_groq("prompt")

    assert models_tried == ["primary"]
