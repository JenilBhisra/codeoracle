from pydantic import BaseModel

from app.core.exceptions import GeminiRateLimitError
from app.services import gemini_structured


class Explanation(BaseModel):
    summary: str
    risk: str


def test_generate_structured_parses_valid_json(monkeypatch):
    monkeypatch.setattr(
        gemini_structured, "call_gemini", lambda prompt: '{"summary": "does a thing", "risk": "low"}'
    )

    result, warning = gemini_structured.generate_structured("explain", Explanation)

    assert warning is None
    assert result.summary == "does a thing"


def test_generate_structured_strips_markdown_fences(monkeypatch):
    monkeypatch.setattr(
        gemini_structured, "call_gemini", lambda prompt: '```json\n{"summary": "fenced", "risk": "low"}\n```'
    )

    result, warning = gemini_structured.generate_structured("explain", Explanation)

    assert warning is None
    assert result.summary == "fenced"


def test_generate_structured_repairs_after_first_bad_response(monkeypatch):
    calls = {"count": 0}

    def fake_call(prompt):
        calls["count"] += 1
        if calls["count"] == 1:
            return "not json"
        return '{"summary": "repaired", "risk": "medium"}'

    monkeypatch.setattr(gemini_structured, "call_gemini", fake_call)

    result, warning = gemini_structured.generate_structured("explain", Explanation)

    assert warning is None
    assert result.summary == "repaired"
    assert calls["count"] == 2


def test_generate_structured_returns_warning_when_repair_also_fails(monkeypatch):
    monkeypatch.setattr(gemini_structured, "call_gemini", lambda prompt: "still not json")

    result, warning = gemini_structured.generate_structured("explain", Explanation)

    assert result is None
    assert warning is not None
    assert "could not be repaired" in warning


def test_generate_structured_returns_warning_on_schema_mismatch(monkeypatch):
    monkeypatch.setattr(gemini_structured, "call_gemini", lambda prompt: '{"wrong_field": 1}')

    result, warning = gemini_structured.generate_structured("explain", Explanation)

    assert result is None
    assert warning is not None


def test_generate_structured_never_raises_on_gemini_call_failure(monkeypatch):
    def raise_rate_limit(prompt):
        raise GeminiRateLimitError("rate limited")

    monkeypatch.setattr(gemini_structured, "call_gemini", raise_rate_limit)

    result, warning = gemini_structured.generate_structured("explain", Explanation)

    assert result is None
    assert "Gemini call failed" in warning
