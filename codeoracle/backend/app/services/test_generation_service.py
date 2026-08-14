import json
import uuid

from app.core.config import settings
from app.models.codebase import CodebaseAnalysis, FileAnalysis, FunctionInfo
from app.models.tests import (
    CoverageInfo,
    GeneratedTestChunkResponse,
    GeneratedTestFile,
    GeneratedTestsResult,
    TypeBreakdown,
)
from app.services.chunking import DEFAULT_MAX_CHUNK_CHARS, chunk_files_by_budget
from app.services.gemini_structured import generate_structured
from app.services.prompt_templates import build_structured_prompt

NOT_CONFIGURED_WARNING = "Gemini is not configured (GEMINI_API_KEY/GEMINI_MODEL); test generation was skipped."

MAX_FUNCTIONS_PER_FILE = 8
TEST_TYPES = ("happy_path", "edge_case", "error_case", "mocked_dependency")

TEST_CHUNK_TASK_TEMPLATE = (
    "For EACH file in the facts above, write a complete {framework} test "
    "file (only test the functions/methods listed for that file - do not "
    "invent others). For each targeted function/method, cover a happy path, "
    "at least one edge case, and at least one error case where applicable. "
    "Mock any external service calls (HTTP requests, file I/O, databases) "
    "rather than performing them for real. Add a short comment wherever you "
    "must assume behavior that isn't fully certain from the facts alone. "
    "Return one entry per file in `files`, with `target_file` set to that "
    "file's `path` value from the facts, the complete test file source as a "
    "single string in `code`, a `filename` following {framework} "
    "conventions, `covered_functions` listing every function/method name "
    "your tests actually exercise, and `types` listing which of "
    "happy_path/edge_case/error_case/mocked_dependency your tests include."
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


def _select_targetable_files(analysis: CodebaseAnalysis) -> list[tuple[FileAnalysis, list[FunctionInfo]]]:
    targetable = []
    for file in analysis.files:
        if file.syntax_error is not None:
            continue
        priority_functions = select_priority_functions(file)
        if not priority_functions:
            continue
        targetable.append((file, priority_functions))
    return targetable


def generate_tests_for_chunk(
    files_with_functions: list[tuple[FileAnalysis, list[FunctionInfo]]], *, framework: str
) -> tuple[dict[str, GeneratedTestFile], str | None]:
    """One Gemini call covering multiple files' test generation at once.

    Batching this the same way explanation generation does keeps the total
    number of Gemini calls (and therefore how fast free-tier rate limits get
    hit) roughly proportional to project size / chunk budget rather than to
    file count.
    """
    schema = json.dumps(GeneratedTestChunkResponse.model_json_schema())
    facts = json.dumps(
        [
            {
                "path": file.path,
                "language": file.language,
                "module": file.module,
                "functions": [f.model_dump() for f in functions],
            }
            for file, functions in files_with_functions
        ],
        indent=2,
    )
    task = TEST_CHUNK_TASK_TEMPLATE.format(framework=framework)
    prompt = build_structured_prompt(schema_description=schema, facts_json=facts, task=task)

    result, warning = generate_structured(prompt, GeneratedTestChunkResponse)
    if result is None:
        return {}, warning

    files_by_path = {
        response.target_file: GeneratedTestFile(
            id=uuid.uuid4().hex[:10],
            target_file=response.target_file,
            language=next((f.language for f, _fns in files_with_functions if f.path == response.target_file), ""),
            framework=framework,
            filename=response.filename,
            code=response.code,
            covered_functions=response.covered_functions,
            types=response.types,
            assumptions=response.assumptions,
        )
        for response in result.files
    }
    return files_by_path, None


def _aggregate_framework(files: list[GeneratedTestFile]) -> str:
    seen: list[str] = []
    for file in files:
        if file.framework not in seen:
            seen.append(file.framework)
    return " + ".join(seen)


def _aggregate_coverage(files: list[GeneratedTestFile], analysis: CodebaseAnalysis) -> CoverageInfo:
    if not files:
        return CoverageInfo(value=None, label="not_executed")

    files_by_path = {file.target_file: file for file in files}
    percentages = []
    for source_file in analysis.files:
        test_file = files_by_path.get(source_file.path)
        if test_file is None:
            continue
        targeted = [f for f in select_priority_functions(source_file) if f.name in test_file.covered_functions]
        percentages.append(_estimate_coverage_percent(source_file, targeted))

    value = round(sum(percentages) / len(percentages), 1) if percentages else None
    return CoverageInfo(value=value, label="estimated")


def _aggregate_covered_functions(files: list[GeneratedTestFile]) -> int:
    unique_names = {name for file in files for name in file.covered_functions}
    return len(unique_names)


def _aggregate_breakdown(files: list[GeneratedTestFile]) -> TypeBreakdown:
    counts = dict.fromkeys(TEST_TYPES, 0)
    for file in files:
        for test_type in file.types:
            counts[test_type] = counts.get(test_type, 0) + 1
    return TypeBreakdown(**counts)


def generate_tests_for_project(
    analysis: CodebaseAnalysis, *, max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS
) -> tuple[GeneratedTestsResult, list[str]]:
    """Generate estimated-coverage tests for every analyzable source file.

    Files are grouped by language (each needs its own test framework) and
    then batched into chunks by size budget, so a project with many small
    files costs a handful of Gemini calls instead of one call per file.

    We never execute uploaded code on this host, so coverage is always
    labeled "estimated" (based on which lines the targeted functions span),
    never "measured" - only our own backend's benchmark suite is trusted
    enough to run and get real coverage numbers.
    """
    if not _is_gemini_configured():
        return GeneratedTestsResult(), [NOT_CONFIGURED_WARNING]

    targetable = _select_targetable_files(analysis)

    by_language: dict[str, list[tuple[FileAnalysis, list[FunctionInfo]]]] = {}
    for file, functions in targetable:
        by_language.setdefault(file.language, []).append((file, functions))

    generated: list[GeneratedTestFile] = []
    warnings: list[str] = []

    for language, entries in by_language.items():
        framework = "pytest" if language == "python" else "vitest"
        functions_by_path = {file.path: functions for file, functions in entries}
        chunks = chunk_files_by_budget([file for file, _fns in entries], max_chunk_chars=max_chunk_chars)

        for chunk in chunks:
            chunk_entries = [(file, functions_by_path[file.path]) for file in chunk.files]
            files_by_path, warning = generate_tests_for_chunk(chunk_entries, framework=framework)
            if warning:
                warnings.append(f"{chunk.chunk_id} ({language}): {warning}")
                continue
            for file, _functions in chunk_entries:
                test_file = files_by_path.get(file.path)
                if test_file is None:
                    warnings.append(f"{file.path}: Gemini did not return a test file for this path")
                    continue
                generated.append(test_file)

    result = GeneratedTestsResult(
        framework=_aggregate_framework(generated),
        coverage=_aggregate_coverage(generated, analysis),
        covered_functions=_aggregate_covered_functions(generated),
        breakdown=_aggregate_breakdown(generated),
        files=generated,
    )
    return result, warnings
