from app.core.config import settings
from app.models.codebase import CodebaseAnalysis
from app.models.explanation import ChunkExplanationResult, ModuleExplanation, ProjectOverviewResult
from app.models.graph import DependencyGraph, GraphNode
from app.services import explanation_service
from app.services.python_analyzer import analyze_python_file


def _configure_gemini(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")
    monkeypatch.setattr(settings, "gemini_model", "fake-model")


def _analysis(files):
    return CodebaseAnalysis(
        project_name="demo", languages=["python"], line_count=sum(f.line_count for f in files), files=files
    )


def test_derive_entry_points_from_main_guard_and_default_export():
    files = [
        analyze_python_file("app/run.py", "if __name__ == '__main__':\n    pass\n", line_count=2),
        analyze_python_file("app/lib.py", "def helper():\n    pass\n", line_count=2),
    ]

    entry_points = explanation_service._derive_entry_points(files)

    assert entry_points == ["app/run.py"]


def test_derive_important_modules_ranks_by_function_and_class_count():
    files = [
        analyze_python_file("app/empty.py", "x = 1\n", line_count=1),
        analyze_python_file("app/busy.py", "def a():\n    pass\ndef b():\n    pass\n", line_count=4),
    ]

    important = explanation_service._derive_important_modules(files)

    assert important == ["app.busy"]


def test_external_dependencies_reads_from_graph_only():
    graph = DependencyGraph(
        nodes=[
            GraphNode(id="app.main", label="app.main", type="module", language="python", path="app/main.py"),
            GraphNode(id="os", label="os", type="external", language="python", path=None, external=True),
        ],
        edges=[],
    )

    deps = explanation_service._external_dependencies(graph)

    assert deps == ["os"]


def test_explain_project_skips_when_gemini_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    monkeypatch.setattr(settings, "gemini_model", "")
    files = [analyze_python_file("app/main.py", "def f():\n    pass\n", line_count=2)]

    result = explanation_service.explain_project(_analysis(files), DependencyGraph())

    assert result.modules == []
    assert result.project_overview == ""
    assert "not configured" in result.warnings[0].lower()


def test_explain_project_combines_map_and_reduce_results(monkeypatch):
    _configure_gemini(monkeypatch)
    files = [analyze_python_file("app/main.py", "def f():\n    pass\n", line_count=2)]

    def fake_generate_structured(prompt, response_model):
        if response_model is ChunkExplanationResult:
            return ChunkExplanationResult(
                modules=[ModuleExplanation(module="app.main", path="app/main.py", summary="does a thing")]
            ), None
        return ProjectOverviewResult(project_overview="Overview.", architecture_summary="Architecture."), None

    monkeypatch.setattr(explanation_service, "generate_structured", fake_generate_structured)

    result = explanation_service.explain_project(_analysis(files), DependencyGraph())

    assert result.project_overview == "Overview."
    assert result.architecture_summary == "Architecture."
    assert len(result.modules) == 1
    assert result.modules[0].module == "app.main"
    assert result.warnings == []


def test_explain_project_continues_when_one_chunk_fails(monkeypatch):
    _configure_gemini(monkeypatch)
    # two files, tiny per-chunk budget forces two separate chunk calls
    files = [
        analyze_python_file("app/a.py", "def a():\n    pass\n", line_count=2),
        analyze_python_file("app/b.py", "def b():\n    pass\n", line_count=2),
    ]

    call_count = {"chunk": 0}

    def fake_generate_structured(prompt, response_model):
        if response_model is ChunkExplanationResult:
            call_count["chunk"] += 1
            if call_count["chunk"] == 1:
                return None, "invalid JSON"
            return ChunkExplanationResult(
                modules=[ModuleExplanation(module="app.b", path="app/b.py", summary="does b")]
            ), None
        return ProjectOverviewResult(project_overview="Overview.", architecture_summary="Architecture."), None

    monkeypatch.setattr(explanation_service, "generate_structured", fake_generate_structured)

    result = explanation_service.explain_project(_analysis(files), DependencyGraph(), max_chunk_chars=1)

    assert call_count["chunk"] == 2
    assert len(result.modules) == 1
    assert result.modules[0].module == "app.b"
    assert any("invalid JSON" in w for w in result.warnings)


def test_explain_project_handles_overview_failure_gracefully(monkeypatch):
    _configure_gemini(monkeypatch)
    files = [analyze_python_file("app/main.py", "def f():\n    pass\n", line_count=2)]

    def fake_generate_structured(prompt, response_model):
        if response_model is ChunkExplanationResult:
            return ChunkExplanationResult(
                modules=[ModuleExplanation(module="app.main", path="app/main.py", summary="does a thing")]
            ), None
        return None, "overview generation failed"

    monkeypatch.setattr(explanation_service, "generate_structured", fake_generate_structured)

    result = explanation_service.explain_project(_analysis(files), DependencyGraph())

    assert result.project_overview == ""
    assert result.architecture_summary == ""
    assert len(result.modules) == 1
    assert any("overview generation failed" in w for w in result.warnings)


def test_explain_chunk_returns_empty_and_warning_on_failure(monkeypatch):
    _configure_gemini(monkeypatch)
    files = [analyze_python_file("app/main.py", "def f():\n    pass\n", line_count=2)]

    monkeypatch.setattr(explanation_service, "generate_structured", lambda prompt, response_model: (None, "boom"))

    modules, warning = explanation_service.explain_chunk(files)

    assert modules == []
    assert warning == "boom"
