import json

from app.core.config import settings
from app.models.codebase import CodebaseAnalysis, FileAnalysis
from app.models.explanation import ChunkExplanationResult, ModuleExplanation, ProjectExplanation, ProjectOverviewResult
from app.models.graph import DependencyGraph
from app.services.chunking import DEFAULT_MAX_CHUNK_CHARS, chunk_files_by_budget
from app.services.gemini_structured import generate_structured
from app.services.prompt_templates import build_structured_prompt

NOT_CONFIGURED_WARNING = "Gemini is not configured (GEMINI_API_KEY/GEMINI_MODEL); explanations were skipped."

CHUNK_TASK = (
    "For EACH file in the facts above, produce a module explanation: a short "
    "summary of what it does, per-function inputs/outputs/side effects, "
    "per-class responsibilities, any risks, any limitations, and a "
    "confidence level (high/medium/low) reflecting how certain you are "
    "given only the facts shown. Match each output entry to its file's "
    "`path` and `module` fields exactly as given."
)

OVERVIEW_TASK = (
    "Write a concise project overview (2-4 sentences) and an architecture "
    "summary (3-6 sentences) describing how the modules listed above fit "
    "together, based ONLY on the facts given."
)


def _is_gemini_configured() -> bool:
    return bool(settings.gemini_api_key and settings.gemini_model)


def _derive_entry_points(files: list[FileAnalysis]) -> list[str]:
    entry_points = {f.path for f in files if f.has_main_guard}
    entry_points |= {f.path for f in files if "default" in f.exports}
    return sorted(entry_points)


def _derive_important_modules(files: list[FileAnalysis], *, top_n: int = 5) -> list[str]:
    ranked = sorted(files, key=lambda f: len(f.functions) + len(f.classes), reverse=True)
    return [f.module for f in ranked[:top_n] if f.functions or f.classes]


def _external_dependencies(graph: DependencyGraph) -> list[str]:
    return sorted({node.id for node in graph.nodes if node.external})


def explain_chunk(files: list[FileAnalysis]) -> tuple[list[ModuleExplanation], str | None]:
    schema = json.dumps(ChunkExplanationResult.model_json_schema())
    facts = json.dumps([f.model_dump() for f in files], indent=2)
    prompt = build_structured_prompt(schema_description=schema, facts_json=facts, task=CHUNK_TASK)

    result, warning = generate_structured(prompt, ChunkExplanationResult)
    if result is None:
        return [], warning
    return result.modules, None


def _generate_overview(
    analysis: CodebaseAnalysis,
    modules: list[ModuleExplanation],
    entry_points: list[str],
    important_modules: list[str],
    external_dependencies: list[str],
) -> tuple[ProjectOverviewResult | None, str | None]:
    schema = json.dumps(ProjectOverviewResult.model_json_schema())
    facts = json.dumps(
        {
            "project_name": analysis.project_name,
            "languages": analysis.languages,
            "file_count": len(analysis.files),
            "line_count": analysis.line_count,
            "main_entry_points": entry_points,
            "important_modules": important_modules,
            "external_dependencies": external_dependencies,
            "module_summaries": [{"module": m.module, "summary": m.summary} for m in modules],
        },
        indent=2,
    )
    prompt = build_structured_prompt(schema_description=schema, facts_json=facts, task=OVERVIEW_TASK)
    return generate_structured(prompt, ProjectOverviewResult)


def explain_project(
    analysis: CodebaseAnalysis, graph: DependencyGraph, *, max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS
) -> ProjectExplanation:
    entry_points = _derive_entry_points(analysis.files)
    important_modules = _derive_important_modules(analysis.files)
    external_dependencies = _external_dependencies(graph)

    if not _is_gemini_configured():
        return ProjectExplanation(
            detected_languages=analysis.languages,
            main_entry_points=entry_points,
            important_modules=important_modules,
            external_dependencies=external_dependencies,
            warnings=[NOT_CONFIGURED_WARNING],
        )

    chunks = chunk_files_by_budget(analysis.files, max_chunk_chars=max_chunk_chars)

    all_modules: list[ModuleExplanation] = []
    warnings: list[str] = []

    for chunk in chunks:
        modules, warning = explain_chunk(chunk.files)
        all_modules.extend(modules)
        if warning:
            warnings.append(f"{chunk.chunk_id}: {warning}")

    overview_result, overview_warning = _generate_overview(
        analysis, all_modules, entry_points, important_modules, external_dependencies
    )
    if overview_warning:
        warnings.append(f"project-overview: {overview_warning}")

    all_risks = sorted({risk for module in all_modules for risk in module.risks})
    all_limitations = sorted({limitation for module in all_modules for limitation in module.limitations})

    return ProjectExplanation(
        project_overview=overview_result.project_overview if overview_result else "",
        architecture_summary=overview_result.architecture_summary if overview_result else "",
        detected_languages=analysis.languages,
        main_entry_points=entry_points,
        important_modules=important_modules,
        external_dependencies=external_dependencies,
        modules=all_modules,
        risks=all_risks,
        limitations=all_limitations,
        warnings=warnings,
    )
