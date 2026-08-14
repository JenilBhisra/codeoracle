from app.core.config import settings
from app.models.codebase import CodebaseAnalysis
from app.models.tests import GeneratedTestResponse
from app.services import test_generation_service
from app.services.js_analyzer import analyze_javascript_file
from app.services.python_analyzer import analyze_python_file


def _configure_gemini(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "fake-key")
    monkeypatch.setattr(settings, "gemini_model", "fake-model")


def _analysis(files):
    return CodebaseAnalysis(
        project_name="demo", languages=["python"], line_count=sum(f.line_count for f in files), files=files
    )


# --- priority scoring -------------------------------------------------


def test_select_priority_functions_ranks_public_over_private():
    file = analyze_python_file(
        "app/mod.py",
        "def public_fn():\n    pass\n\ndef _private_fn():\n    pass\n",
        line_count=4,
    )

    ranked = test_generation_service.select_priority_functions(file)

    assert [f.name for f in ranked] == ["public_fn", "_private_fn"]


def test_select_priority_functions_ranks_validation_named_higher():
    file = analyze_python_file(
        "app/mod.py",
        "def process():\n    pass\n\ndef validate_input():\n    pass\n",
        line_count=4,
    )

    ranked = test_generation_service.select_priority_functions(file)

    assert ranked[0].name == "validate_input"


def test_select_priority_functions_ranks_top_level_over_methods():
    file = analyze_python_file(
        "app/mod.py",
        "class Widget:\n    def do_thing(self):\n        pass\n\ndef top_level():\n    pass\n",
        line_count=5,
    )

    ranked = test_generation_service.select_priority_functions(file)

    assert ranked[0].name == "top_level"


def test_select_priority_functions_respects_limit():
    body = "\n".join(f"def fn_{i}():\n    pass\n" for i in range(20))
    file = analyze_python_file("app/mod.py", body, line_count=40)

    ranked = test_generation_service.select_priority_functions(file, limit=3)

    assert len(ranked) == 3


def test_select_priority_functions_uses_branch_count_as_tiebreaker():
    file = analyze_python_file(
        "app/mod.py",
        (
            "def simple():\n    return 1\n\n"
            "def branchy():\n    if True:\n        for x in []:\n            pass\n    return 1\n"
        ),
        line_count=8,
    )

    ranked = test_generation_service.select_priority_functions(file)

    assert ranked[0].name == "branchy"


# --- generate_tests_for_file --------------------------------------------


def test_generate_tests_for_file_returns_none_for_file_with_no_functions():
    file = analyze_python_file("app/empty.py", "x = 1\n", line_count=1)

    result, warning = test_generation_service.generate_tests_for_file(file, framework="pytest")

    assert result is None
    assert warning is None


def test_generate_tests_for_file_returns_generated_test(monkeypatch):
    _configure_gemini(monkeypatch)
    file = analyze_python_file("app/mod.py", "def add(a, b):\n    return a + b\n", line_count=2)

    monkeypatch.setattr(
        test_generation_service,
        "generate_structured",
        lambda prompt, response_model: (
            GeneratedTestResponse(
                filename="test_mod.py",
                code="def test_add(): pass",
                covered_functions=["add"],
                types=["happy_path"],
            ),
            None,
        ),
    )

    result, warning = test_generation_service.generate_tests_for_file(file, framework="pytest")

    assert warning is None
    assert result.id
    assert result.filename == "test_mod.py"
    assert result.framework == "pytest"
    assert result.types == ["happy_path"]


def test_generate_tests_for_file_returns_warning_on_generation_failure(monkeypatch):
    _configure_gemini(monkeypatch)
    file = analyze_python_file("app/mod.py", "def add(a, b):\n    return a + b\n", line_count=2)

    monkeypatch.setattr(test_generation_service, "generate_structured", lambda prompt, response_model: (None, "boom"))

    result, warning = test_generation_service.generate_tests_for_file(file, framework="pytest")

    assert result is None
    assert warning == "boom"


# --- generate_tests_for_project -------------------------------------------


def test_generate_tests_for_project_skips_when_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")
    monkeypatch.setattr(settings, "gemini_model", "")
    files = [analyze_python_file("app/mod.py", "def f():\n    pass\n", line_count=2)]

    result, warnings = test_generation_service.generate_tests_for_project(_analysis(files))

    assert result.files == []
    assert result.coverage.label == "not_executed"
    assert "not configured" in warnings[0].lower()


def test_generate_tests_for_project_skips_files_with_syntax_errors(monkeypatch):
    _configure_gemini(monkeypatch)
    good = analyze_python_file("app/good.py", "def f():\n    pass\n", line_count=2)
    broken = analyze_python_file("app/broken.py", "def broken(:", line_count=1)

    calls = []
    monkeypatch.setattr(
        test_generation_service,
        "generate_structured",
        lambda prompt, response_model: calls.append(1)
        or (GeneratedTestResponse(filename="test_good.py", code="pass", covered_functions=["f"]), None),
    )

    result, _warnings = test_generation_service.generate_tests_for_project(_analysis([good, broken]))

    assert len(result.files) == 1
    assert result.files[0].target_file == "app/good.py"
    assert len(calls) == 1


def test_generate_tests_for_project_uses_pytest_for_python_and_vitest_for_js(monkeypatch):
    _configure_gemini(monkeypatch)
    py_file = analyze_python_file("app/mod.py", "def f():\n    pass\n", line_count=2)
    js_file = analyze_javascript_file("src/mod.js", "export function f() { return 1; }\n", line_count=1)

    monkeypatch.setattr(
        test_generation_service,
        "generate_structured",
        lambda prompt, response_model: (
            GeneratedTestResponse(filename="test.file", code="pass", covered_functions=["f"]),
            None,
        ),
    )

    result, _warnings = test_generation_service.generate_tests_for_project(_analysis([py_file, js_file]))

    frameworks = {g.target_file: g.framework for g in result.files}
    assert frameworks["app/mod.py"] == "pytest"
    assert frameworks["src/mod.js"] == "vitest"
    assert result.framework == "pytest + vitest"


def test_generate_tests_for_project_continues_when_one_file_fails(monkeypatch):
    _configure_gemini(monkeypatch)
    file_a = analyze_python_file("app/a.py", "def a():\n    pass\n", line_count=2)
    file_b = analyze_python_file("app/b.py", "def b():\n    pass\n", line_count=2)

    def fake_generate_structured(prompt, response_model):
        if "app/a.py" in prompt:
            return None, "generation failed"
        return GeneratedTestResponse(filename="test_b.py", code="pass", covered_functions=["b"]), None

    monkeypatch.setattr(test_generation_service, "generate_structured", fake_generate_structured)

    result, warnings = test_generation_service.generate_tests_for_project(_analysis([file_a, file_b]))

    assert len(result.files) == 1
    assert result.files[0].target_file == "app/b.py"
    assert any("app/a.py" in w and "generation failed" in w for w in warnings)


def test_coverage_label_is_never_measured(monkeypatch):
    _configure_gemini(monkeypatch)
    file = analyze_python_file("app/mod.py", "def f():\n    pass\n", line_count=2)

    monkeypatch.setattr(
        test_generation_service,
        "generate_structured",
        lambda prompt, response_model: (
            GeneratedTestResponse(filename="test_mod.py", code="pass", covered_functions=["f"]),
            None,
        ),
    )

    result, _warnings = test_generation_service.generate_tests_for_project(_analysis([file]))

    assert result.coverage.label != "measured"


def test_breakdown_counts_files_per_type(monkeypatch):
    _configure_gemini(monkeypatch)
    file_a = analyze_python_file("app/a.py", "def a():\n    pass\n", line_count=2)
    file_b = analyze_python_file("app/b.py", "def b():\n    pass\n", line_count=2)

    def fake_generate_structured(prompt, response_model):
        if "app/a.py" in prompt:
            return (
                GeneratedTestResponse(
                    filename="test_a.py", code="pass", covered_functions=["a"], types=["happy_path", "edge_case"]
                ),
                None,
            )
        return (
            GeneratedTestResponse(filename="test_b.py", code="pass", covered_functions=["b"], types=["happy_path"]),
            None,
        )

    monkeypatch.setattr(test_generation_service, "generate_structured", fake_generate_structured)

    result, _warnings = test_generation_service.generate_tests_for_project(_analysis([file_a, file_b]))

    assert result.breakdown.happy_path == 2
    assert result.breakdown.edge_case == 1
    assert result.breakdown.error_case == 0
    assert result.covered_functions == 2
