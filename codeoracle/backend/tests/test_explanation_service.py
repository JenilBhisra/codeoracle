from app.core.config import settings
from app.models.codebase import CodebaseAnalysis
from app.models.explanation import (
    ChunkExplanationResult,
    FunctionNarrative,
    ModuleNarrative,
    ProjectOverviewResult,
)
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


def test_build_file_tree_nests_by_directory():
    files = [
        analyze_python_file("app/main.py", "x = 1\n", line_count=1),
        analyze_python_file("app/utils/helpers.py", "x = 1\n", line_count=1),
    ]

    tree = explanation_service._build_file_tree(files)

    assert len(tree) == 1
    app_folder = tree[0]
    assert app_folder.name == "app"
    assert app_folder.type == "folder"
    names = {child.name for child in app_folder.children}
    assert names == {"main.py", "utils"}
    main_node = next(c for c in app_folder.children if c.name == "main.py")
    assert main_node.type == "file"
    assert main_node.moduleId == "app.main"


def test_build_signature_includes_types_and_defaults():
    file = analyze_python_file(
        "app/mod.py", "def greet(name: str, loud: bool = False) -> str:\n    return name\n", line_count=2
    )

    signature = explanation_service._build_signature(file.functions[0])

    assert signature == "greet(name: str, loud: bool = False) -> str"


def test_merge_module_falls_back_gracefully_without_narrative():
    file = analyze_python_file(
        "app/mod.py", "import os\n\ndef f(a: int) -> int:\n    return a\n", line_count=4
    )

    merged = explanation_service._merge_module(file, None)

    assert merged.id == "app.mod"
    assert merged.purpose == ""
    assert merged.imports == ["os"]
    assert merged.function_count == 1
    assert merged.functions[0].signature == "f(a: int) -> int"
    assert merged.functions[0].confidence == "low"


def test_merge_module_combines_static_facts_with_narrative():
    file = analyze_python_file("app/mod.py", "def f(a: int) -> int:\n    return a\n", line_count=2)
    narrative = ModuleNarrative(
        id="app.mod",
        purpose="Does a thing.",
        responsibilities=["Compute a value"],
        risk="medium",
        confidence="high",
        functions=[
            FunctionNarrative(
                name="f",
                explanation="Returns the input unchanged.",
                parameter_descriptions={"a": "The input value"},
                returns="The same value",
                side_effects=[],
                risk="low",
                confidence="high",
            )
        ],
    )

    merged = explanation_service._merge_module(file, narrative)

    assert merged.purpose == "Does a thing."
    assert merged.risk == "medium"
    func = merged.functions[0]
    assert func.explanation == "Returns the input unchanged."
    assert func.parameters[0].type == "int"
    assert func.parameters[0].description == "The input value"
    assert func.confidence == "high"


def test_explain_project_skips_when_gemini_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    monkeypatch.setattr(settings, "gemini_model", "")
    files = [analyze_python_file("app/main.py", "def f():\n    pass\n", line_count=2)]

    result = explanation_service.explain_project(_analysis(files), DependencyGraph())

    assert len(result.modules) == 1
    assert result.modules[0].purpose == ""
    assert result.project_summary == ""
    assert result.confidence == "low"
    assert "not configured" in result.warnings[0].lower()


def test_explain_project_combines_map_and_reduce_results(monkeypatch):
    _configure_gemini(monkeypatch)
    files = [analyze_python_file("app/main.py", "def f():\n    pass\n", line_count=2)]

    def fake_generate_structured(prompt, response_model):
        if response_model is ChunkExplanationResult:
            return ChunkExplanationResult(
                modules=[ModuleNarrative(id="app.main", purpose="does a thing")]
            ), None
        return ProjectOverviewResult(project_summary="Overview.", architecture_overview="Architecture."), None

    monkeypatch.setattr(explanation_service, "generate_structured", fake_generate_structured)

    result = explanation_service.explain_project(_analysis(files), DependencyGraph())

    assert result.project_summary == "Overview."
    assert result.architecture_overview == "Architecture."
    assert len(result.modules) == 1
    assert result.modules[0].id == "app.main"
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
            return ChunkExplanationResult(modules=[ModuleNarrative(id="app.b", purpose="does b")]), None
        return ProjectOverviewResult(project_summary="Overview.", architecture_overview="Architecture."), None

    monkeypatch.setattr(explanation_service, "generate_structured", fake_generate_structured)

    result = explanation_service.explain_project(_analysis(files), DependencyGraph(), max_chunk_chars=1)

    assert call_count["chunk"] == 2
    # both modules are still present (structure-only for the failed chunk)
    assert {m.id for m in result.modules} == {"app.a", "app.b"}
    module_b = next(m for m in result.modules if m.id == "app.b")
    assert module_b.purpose == "does b"
    module_a = next(m for m in result.modules if m.id == "app.a")
    assert module_a.purpose == ""
    assert any("invalid JSON" in w for w in result.warnings)


def test_explain_project_handles_overview_failure_gracefully(monkeypatch):
    _configure_gemini(monkeypatch)
    files = [analyze_python_file("app/main.py", "def f():\n    pass\n", line_count=2)]

    def fake_generate_structured(prompt, response_model):
        if response_model is ChunkExplanationResult:
            return ChunkExplanationResult(
                modules=[ModuleNarrative(id="app.main", purpose="does a thing")]
            ), None
        return None, "overview generation failed"

    monkeypatch.setattr(explanation_service, "generate_structured", fake_generate_structured)

    result = explanation_service.explain_project(_analysis(files), DependencyGraph())

    assert result.project_summary == ""
    assert result.architecture_overview == ""
    assert len(result.modules) == 1
    assert any("overview generation failed" in w for w in result.warnings)


def test_explain_chunk_returns_empty_and_warning_on_failure(monkeypatch):
    _configure_gemini(monkeypatch)
    files = [analyze_python_file("app/main.py", "def f():\n    pass\n", line_count=2)]

    monkeypatch.setattr(explanation_service, "generate_structured", lambda prompt, response_model: (None, "boom"))

    narratives, warning = explanation_service.explain_chunk(files)

    assert narratives == {}
    assert warning == "boom"
