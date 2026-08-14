import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.models.codebase import CodebaseAnalysis
from app.models.refactor import RefactorProposalResponse
from app.services import refactor_service
from app.services.python_analyzer import analyze_python_file


def _configure_gemini(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")
    monkeypatch.setattr(settings, "gemini_model", "fake-model")


def _write_source(tmp_path, relative_path, content):
    full_path = tmp_path / relative_path
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_text(content)
    return content


def _fake_response(**overrides):
    defaults = dict(
        refactored_code="def f(a: int) -> int:\n    return a\n",
        summary="Add type hints",
        benefit="Better tooling support",
        risk="low",
        breaking_changes=[],
        migration_notes=[],
        assumptions=[],
        impact_areas=[],
    )
    defaults.update(overrides)
    return RefactorProposalResponse(**defaults)


def test_risk_rejects_invalid_values():
    with pytest.raises(ValidationError):
        RefactorProposalResponse(
            refactored_code="x",
            summary="x",
            benefit="x",
            risk="extreme",
        )


def test_impact_areas_rejects_values_outside_fixed_categories():
    with pytest.raises(ValidationError):
        _fake_response(impact_areas=["Something not on the list"])


def test_generate_refactor_for_file_returns_none_for_trivial_file(tmp_path):
    _write_source(tmp_path, "app/consts.py", "MAX_SIZE = 100\n")
    file = analyze_python_file("app/consts.py", "MAX_SIZE = 100\n", line_count=1)

    proposal, warning = refactor_service.generate_refactor_for_file(tmp_path, file)

    assert proposal is None
    assert warning is None


def test_generate_refactor_for_file_includes_real_source_in_prompt(tmp_path, monkeypatch):
    _configure_gemini(monkeypatch)
    source = "def distinctive_marker_fn(a, b):\n    return a - b\n"
    _write_source(tmp_path, "app/mod.py", source)
    file = analyze_python_file("app/mod.py", source, line_count=2)

    seen_prompt = {}

    def fake_generate_structured(prompt, response_model):
        seen_prompt["prompt"] = prompt
        return _fake_response(), None

    monkeypatch.setattr(refactor_service, "generate_structured", fake_generate_structured)

    refactor_service.generate_refactor_for_file(tmp_path, file)

    assert "distinctive_marker_fn" in seen_prompt["prompt"]


def test_generate_refactor_for_file_always_requires_human_review_and_keeps_original(tmp_path, monkeypatch):
    _configure_gemini(monkeypatch)
    source = "def f(a):\n    return a\n"
    _write_source(tmp_path, "app/mod.py", source)
    file = analyze_python_file("app/mod.py", source, line_count=2)

    monkeypatch.setattr(refactor_service, "generate_structured", lambda prompt, response_model: (_fake_response(), None))

    proposal, warning = refactor_service.generate_refactor_for_file(tmp_path, file)

    assert warning is None
    assert proposal.id
    assert proposal.requires_human_review is True
    assert proposal.path == "app/mod.py"
    assert proposal.risk == "low"
    assert proposal.original_code == source


def test_generate_refactor_for_file_returns_warning_on_failure(tmp_path, monkeypatch):
    _configure_gemini(monkeypatch)
    source = "def f(a):\n    return a\n"
    _write_source(tmp_path, "app/mod.py", source)
    file = analyze_python_file("app/mod.py", source, line_count=2)

    monkeypatch.setattr(refactor_service, "generate_structured", lambda prompt, response_model: (None, "boom"))

    proposal, warning = refactor_service.generate_refactor_for_file(tmp_path, file)

    assert proposal is None
    assert warning == "boom"


def test_generate_refactors_for_project_skips_when_not_configured(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    monkeypatch.setattr(settings, "gemini_model", "")
    source = "def f(a):\n    return a\n"
    _write_source(tmp_path, "app/mod.py", source)
    file = analyze_python_file("app/mod.py", source, line_count=2)
    analysis = CodebaseAnalysis(project_name="demo", languages=["python"], line_count=2, files=[file])

    proposals, warnings = refactor_service.generate_refactors_for_project(analysis, tmp_path)

    assert proposals == []
    assert "not configured" in warnings[0].lower()


def test_generate_refactors_for_project_skips_files_with_syntax_errors(tmp_path, monkeypatch):
    _configure_gemini(monkeypatch)
    good_source = "def f(a):\n    return a\n"
    _write_source(tmp_path, "app/good.py", good_source)
    good = analyze_python_file("app/good.py", good_source, line_count=2)
    broken = analyze_python_file("app/broken.py", "def broken(:", line_count=1)
    analysis = CodebaseAnalysis(
        project_name="demo", languages=["python"], line_count=3, files=[good, broken]
    )

    monkeypatch.setattr(refactor_service, "generate_structured", lambda prompt, response_model: (_fake_response(), None))

    proposals, _warnings = refactor_service.generate_refactors_for_project(analysis, tmp_path)

    assert len(proposals) == 1
    assert proposals[0].path == "app/good.py"


def test_generate_refactors_for_project_continues_when_one_file_fails(tmp_path, monkeypatch):
    _configure_gemini(monkeypatch)
    source_a = "def a():\n    return 1\n"
    source_b = "def b():\n    return 2\n"
    _write_source(tmp_path, "app/a.py", source_a)
    _write_source(tmp_path, "app/b.py", source_b)
    file_a = analyze_python_file("app/a.py", source_a, line_count=2)
    file_b = analyze_python_file("app/b.py", source_b, line_count=2)
    analysis = CodebaseAnalysis(project_name="demo", languages=["python"], line_count=4, files=[file_a, file_b])

    def fake_generate_structured(prompt, response_model):
        if "app/a.py" in prompt:
            return None, "generation failed"
        return _fake_response(), None

    monkeypatch.setattr(refactor_service, "generate_structured", fake_generate_structured)

    proposals, warnings = refactor_service.generate_refactors_for_project(analysis, tmp_path)

    assert len(proposals) == 1
    assert proposals[0].path == "app/b.py"
    assert any("app/a.py" in w and "generation failed" in w for w in warnings)
