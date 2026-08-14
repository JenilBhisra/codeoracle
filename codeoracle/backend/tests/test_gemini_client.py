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


def test_call_gemini_once_translates_httpx_read_timeout(monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "gemini-test-model")
    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **kwargs: _FakeClient(httpx.ReadTimeout("timed out")))

    with pytest.raises(GeminiTimeoutError):
        gemini_client.call_gemini_once("hello")


def test_call_gemini_once_translates_httpx_connect_error(monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "gemini-test-model")
    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **kwargs: _FakeClient(httpx.ConnectError("refused")))

    with pytest.raises(GeminiTimeoutError):
        gemini_client.call_gemini_once("hello")


def _api_error(code: int) -> genai_errors.APIError:
    return genai_errors.APIError(code, {"error": {"message": "boom", "status": "ERROR"}})


def test_call_gemini_once_translates_rate_limit_api_error(monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "gemini-test-model")
    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **kwargs: _FakeClient(_api_error(429)))

    with pytest.raises(GeminiRateLimitError):
        gemini_client.call_gemini_once("hello")


@pytest.mark.parametrize("code", [408, 500, 502, 503, 504])
def test_call_gemini_once_translates_transient_server_api_errors(monkeypatch, code):
    monkeypatch.setattr(settings, "gemini_model", "gemini-test-model")
    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **kwargs: _FakeClient(_api_error(code)))

    with pytest.raises(GeminiTimeoutError):
        gemini_client.call_gemini_once("hello")


def test_call_gemini_once_reraises_non_transient_api_error(monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "gemini-test-model")
    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **kwargs: _FakeClient(_api_error(400)))

    with pytest.raises(genai_errors.APIError):
        gemini_client.call_gemini_once("hello")


def test_call_gemini_once_raises_when_model_missing(monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "")

    with pytest.raises(GeminiNotConfiguredError):
        gemini_client.call_gemini_once("hello")


def test_call_gemini_once_raises_when_key_missing(monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "gemini-test-model")
    monkeypatch.setattr(settings, "gemini_api_key", "")

    with pytest.raises(GeminiNotConfiguredError):
        gemini_client.call_gemini_once("hello")


def test_call_gemini_returns_result_on_first_success(monkeypatch):
    monkeypatch.setattr(gemini_client, "call_gemini_once", lambda prompt: "ok response")

    assert gemini_client.call_gemini("prompt") == "ok response"


def test_call_gemini_retries_on_rate_limit_then_succeeds(monkeypatch):
    calls = {"count": 0}

    def flaky(prompt):
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
    monkeypatch.setattr(settings, "gemini_max_retries", 2)

    def always_timeout(prompt):
        raise GeminiTimeoutError("timed out")

    monkeypatch.setattr(gemini_client, "call_gemini_once", always_timeout)
    monkeypatch.setattr(gemini_client.time, "sleep", lambda seconds: None)

    with pytest.raises(GeminiTimeoutError):
        gemini_client.call_gemini("prompt")


def test_call_gemini_uses_flat_rate_limit_backoff_not_exponential(monkeypatch):
    """Rate limits need real wall-clock time to clear a per-minute quota, so
    they get a distinct, much longer, flat backoff instead of the short
    exponential curve used for timeouts."""
    monkeypatch.setattr(settings, "gemini_max_retries", 3)
    monkeypatch.setattr(settings, "gemini_rate_limit_backoff_seconds", 20)
    sleep_calls = []
    monkeypatch.setattr(gemini_client.time, "sleep", lambda seconds: sleep_calls.append(seconds))

    def always_rate_limited(prompt):
        raise GeminiRateLimitError("rate limited")

    monkeypatch.setattr(gemini_client, "call_gemini_once", always_rate_limited)

    with pytest.raises(GeminiRateLimitError):
        gemini_client.call_gemini("prompt")

    assert sleep_calls == [20, 20]


def test_call_gemini_does_not_retry_non_transient_errors(monkeypatch):
    def broken(prompt):
        raise ValueError("something else entirely")

    monkeypatch.setattr(gemini_client, "call_gemini_once", broken)

    with pytest.raises(ValueError):
        gemini_client.call_gemini("prompt")
