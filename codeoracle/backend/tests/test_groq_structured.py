from pydantic import BaseModel

from app.core.exceptions import GroqRateLimitError
from app.services import groq_structured


class Explanation(BaseModel):
    summary: str
    risk: str


def test_generate_structured_parses_valid_json(monkeypatch):
    monkeypatch.setattr(
        groq_structured, "call_groq", lambda prompt, **kwargs: '{"summary": "does a thing", "risk": "low"}'
    )

    result, warning = groq_structured.generate_structured("explain", Explanation)

    assert warning is None
    assert result.summary == "does a thing"


def test_generate_structured_strips_markdown_fences(monkeypatch):
    monkeypatch.setattr(
        groq_structured, "call_groq", lambda prompt, **kwargs: '```json\n{"summary": "fenced", "risk": "low"}\n```'
    )

    result, warning = groq_structured.generate_structured("explain", Explanation)

    assert warning is None
    assert result.summary == "fenced"


def test_generate_structured_repairs_after_first_bad_response(monkeypatch):
    calls = {"count": 0}

    def fake_call(prompt, **kwargs):
        calls["count"] += 1
        if calls["count"] == 1:
            return "not json"
        return '{"summary": "repaired", "risk": "medium"}'

    monkeypatch.setattr(groq_structured, "call_groq", fake_call)

    result, warning = groq_structured.generate_structured("explain", Explanation)

    assert warning is None
    assert result.summary == "repaired"
    assert calls["count"] == 2


def test_generate_structured_returns_warning_when_repair_also_fails(monkeypatch):
    monkeypatch.setattr(groq_structured, "call_groq", lambda prompt, **kwargs: "still not json")

    result, warning = groq_structured.generate_structured("explain", Explanation)

    assert result is None
    assert warning is not None
    assert "could not be repaired" in warning


def test_generate_structured_returns_warning_on_schema_mismatch(monkeypatch):
    monkeypatch.setattr(groq_structured, "call_groq", lambda prompt, **kwargs: '{"wrong_field": 1}')

    result, warning = groq_structured.generate_structured("explain", Explanation)

    assert result is None
    assert warning is not None


def test_generate_structured_never_raises_on_groq_call_failure(monkeypatch):
    def raise_rate_limit(prompt, **kwargs):
        raise GroqRateLimitError("rate limited")

    monkeypatch.setattr(groq_structured, "call_groq", raise_rate_limit)

    result, warning = groq_structured.generate_structured("explain", Explanation)

    assert result is None
    assert "Groq call failed" in warning


def test_generate_structured_passes_response_model_schema_to_call_groq(monkeypatch):
    seen = {}

    def fake_call(prompt, **kwargs):
        seen.update(kwargs)
        return '{"summary": "x", "risk": "low"}'

    monkeypatch.setattr(groq_structured, "call_groq", fake_call)

    groq_structured.generate_structured("explain", Explanation)

    assert seen["schema_name"] == "Explanation"
    assert seen["schema"] == Explanation.model_json_schema()
