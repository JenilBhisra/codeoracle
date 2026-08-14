import json

from app.core.config import settings
from app.models.codebase import CodebaseAnalysis, FileAnalysis, FunctionInfo
from app.models.tests import GeneratedTestFile, GeneratedTestResponse
from app.services.gemini_structured import generate_structured
from app.services.prompt_templates import build_structured_prompt

NOT_CONFIGURED_WARNING = "Gemini is not configured (GEMINI_API_KEY/GEMINI_MODEL); test generation was skipped."

MAX_FUNCTIONS_PER_FILE = 8

TEST_TASK_TEMPLATE = (
    "Write a complete {framework} test file for the source file described in "
    "the facts above (only test the functions/methods listed - do not invent "
    "others). For each targeted function/method, cover a happy path, at "
    "least one edge case, and at least one error case where applicable. "
    "Mock any external service calls (HTTP requests, file I/O, databases) "
    "rather than performing them for real. Add a short comment wherever you "
    "must assume behavior that isn't fully certain from the facts alone. "
    "Return the complete test file source as a single string in `code`, a "
    "`filename` for it following {framework} conventions, and "
    "`covered_functions` listing every function/method name your tests "
    "actually exercise."
)


def _is_gemini_configured() -> bool:
    return bool(settings.gemini_api_key and settings.gemini_model)


def _is_public(name: str) -> bool:
    return not name.startswith("_")


def _looks_like_validation(name: str) -> bool:
    lowered = name.lower()
    return any(keyword in lowered for keyword in ("valid", "check", "verify", "sanitize", "assert"))


def _priority_score(func: FunctionInfo, *, is_method: bool) -> tuple[int, int, int, int]:
    """Higher score = generate tests for this function first.

    Ordering follows the spec's stated priority: pure/top-level functions,
    then public methods, then validation-sounding logic, then branch-heavy
    functions (as a tiebreaker within each tier).
    """
    return (
        0 if is_method else 1,
        1 if _is_public(func.name) else 0,
        1 if _looks_like_validation(func.name) else 0,
        func.branch_count,
    )


def select_priority_functions(file: FileAnalysis, *, limit: int = MAX_FUNCTIONS_PER_FILE) -> list[FunctionInfo]:
    candidates: list[tuple[FunctionInfo, bool]] = [(f, False) for f in file.functions]
    candidates += [(method, True) for cls in file.classes for method in cls.methods]

    ranked = sorted(candidates, key=lambda pair: _priority_score(pair[0], is_method=pair[1]), reverse=True)
    return [func for func, _is_method in ranked[:limit]]


def _estimate_coverage_percent(file: FileAnalysis, targeted_functions: list[FunctionInfo]) -> float:
    if not file.line_count:
        return 0.0
    targeted_lines = sum(
        (func.line_end - func.line_start + 1) for func in targeted_functions if func.line_end is not None
    )
    return min(100.0, round((targeted_lines / file.line_count) * 100, 1))


def generate_tests_for_file(file: FileAnalysis, *, framework: str) -> tuple[GeneratedTestFile | None, str | None]:
    priority_functions = select_priority_functions(file)
    if not priority_functions:
        return None, None

    schema = json.dumps(GeneratedTestResponse.model_json_schema())
    facts = json.dumps(
        {
            "path": file.path,
            "language": file.language,
            "module": file.module,
            "functions": [f.model_dump() for f in priority_functions],
        },
        indent=2,
    )
    task = TEST_TASK_TEMPLATE.format(framework=framework)
    prompt = build_structured_prompt(schema_description=schema, facts_json=facts, task=task)

    result, warning = generate_structured(prompt, GeneratedTestResponse)
    if result is None:
        return None, warning

    return (
        GeneratedTestFile(
            target_file=file.path,
            language=file.language,
            test_framework=framework,
            filename=result.filename,
            code=result.code,
            covered_functions=result.covered_functions,
            assumptions=result.assumptions,
            coverage_label="estimated",
            estimated_coverage_percent=_estimate_coverage_percent(file, priority_functions),
        ),
        None,
    )


def generate_tests_for_project(analysis: CodebaseAnalysis) -> tuple[list[GeneratedTestFile], list[str]]:
    """Generate estimated-coverage test files for every analyzable source file.

    We never execute uploaded code on this host, so coverage here is always
    labeled "estimated" (based on which lines the targeted functions span),
    never "measured" - only our own backend's benchmark suite is trusted
    enough to run and get real coverage numbers.
    """
    if not _is_gemini_configured():
        return [], [NOT_CONFIGURED_WARNING]

    generated: list[GeneratedTestFile] = []
    warnings: list[str] = []

    for file in analysis.files:
        if file.syntax_error is not None:
            continue

        framework = "pytest" if file.language == "python" else "vitest"
        test_file, warning = generate_tests_for_file(file, framework=framework)
        if test_file is not None:
            generated.append(test_file)
        if warning:
            warnings.append(f"{file.path}: {warning}")

    return generated, warnings
