import json
from pathlib import Path

from app.core.config import settings
from app.models.codebase import CodebaseAnalysis, FileAnalysis, FunctionInfo
from app.models.explanation import (
    ChunkExplanationResult,
    FileTreeNode,
    FunctionExplanation,
    FunctionNarrative,
    FunctionParameter,
    ModuleExplanation,
    ModuleNarrative,
    ProjectExplanation,
    ProjectOverviewResult,
)
from app.models.graph import DependencyGraph
from app.services.chunking import DEFAULT_MAX_CHUNK_CHARS, chunk_files_by_budget
from app.services.groq_structured import generate_structured
from app.services.prompt_templates import build_structured_prompt

NOT_CONFIGURED_WARNING = "Groq is not configured (GROQ_API_KEY/GROQ_MODEL); explanations were skipped."

CHUNK_TASK = (
    "For EACH file in the facts above, return one entry in `modules` with `id` "
    "set to that file's `module` value. Write a concise `purpose` (1-2 "
    "sentences) and up to 4 `responsibilities` for the module. Then for EACH "
    "function/method listed in that file's facts (top-level `functions` and "
    "each class's `methods`), return one entry in `functions` (matched by "
    "`name`) with: a clear `explanation` of what it does, a "
    "`parameter_descriptions` list with one {name, description} entry per "
    "parameter, a `returns` description, any `side_effects` (empty list if "
    "none), a `risk` level, and a `confidence` level reflecting how certain "
    "you are given only the facts shown."
)

OVERVIEW_TASK = (
    "Using the module summaries below, write a `project_summary` (2-4 "
    "sentences) and an `architecture_overview` (3-6 sentences) describing how "
    "the modules fit together, based ONLY on the facts given. Set an overall "
    "`confidence` level. List up to 5 `limitations` - things you could not "
    "determine from the facts alone."
)


def _is_groq_configured() -> bool:
    return bool(settings.groq_api_key and settings.groq_model)


def _derive_entry_points(files: list[FileAnalysis]) -> list[str]:
    entry_points = {f.path for f in files if f.has_main_guard}
    entry_points |= {f.path for f in files if "default" in f.exports}
    return sorted(entry_points)


def _external_dependencies(graph: DependencyGraph) -> list[str]:
    return sorted({node.id for node in graph.nodes if node.external})


def _build_file_tree(files: list[FileAnalysis]) -> list[FileTreeNode]:
    tree: dict = {}
    for file in files:
        parts = Path(file.path).parts
        cursor = tree
        for part in parts[:-1]:
            cursor = cursor.setdefault(part, {})
        cursor[parts[-1]] = file

    def build(node: dict) -> list[FileTreeNode]:
        result = []
        for name, value in sorted(node.items()):
            if isinstance(value, dict):
                result.append(FileTreeNode(name=name, type="folder", children=build(value)))
            else:
                result.append(
                    FileTreeNode(name=name, type="file", language=value.language, moduleId=value.module)
                )
        return result

    return build(tree)


def _build_signature(func: FunctionInfo) -> str:
    parts = []
    for param in func.parameters:
        piece = param.name
        if param.annotation:
            piece += f": {param.annotation}"
        if param.default is not None:
            piece += f" = {param.default}"
        parts.append(piece)
    prefix = "async " if func.is_async else ""
    signature = f"{prefix}{func.name}({', '.join(parts)})"
    if func.return_annotation:
        signature += f" -> {func.return_annotation}"
    return signature


def _merge_function(static: FunctionInfo, narrative: FunctionNarrative | None) -> FunctionExplanation:
    descriptions = {pd.name: pd.description for pd in narrative.parameter_descriptions} if narrative else {}
    parameters = [
        FunctionParameter(name=p.name, type=p.annotation, description=descriptions.get(p.name, ""))
        for p in static.parameters
    ]
    return FunctionExplanation(
        name=static.name,
        signature=_build_signature(static),
        explanation=narrative.explanation if narrative else "",
        parameters=parameters,
        returns=narrative.returns if narrative else "",
        side_effects=narrative.side_effects if narrative else [],
        calls=static.calls,
        risk=narrative.risk if narrative else "low",
        confidence=narrative.confidence if narrative else "low",
    )


def _merge_module(file: FileAnalysis, narrative: ModuleNarrative | None) -> ModuleExplanation:
    all_functions = list(file.functions) + [method for cls in file.classes for method in cls.methods]
    narrative_by_name = {f.name: f for f in narrative.functions} if narrative else {}
    functions = [_merge_function(func, narrative_by_name.get(func.name)) for func in all_functions]

    return ModuleExplanation(
        id=file.module,
        path=file.path,
        language=file.language,
        purpose=narrative.purpose if narrative else "",
        responsibilities=narrative.responsibilities if narrative else [],
        imports=[imp.module for imp in file.imports],
        risk=narrative.risk if narrative else "low",
        function_count=len(functions),
        class_count=len(file.classes),
        functions=functions,
    )


def explain_chunk(files: list[FileAnalysis]) -> tuple[dict[str, ModuleNarrative], str | None]:
    schema = json.dumps(ChunkExplanationResult.model_json_schema())
    facts = json.dumps([f.model_dump() for f in files], indent=2)
    prompt = build_structured_prompt(schema_description=schema, facts_json=facts, task=CHUNK_TASK)

    result, warning = generate_structured(prompt, ChunkExplanationResult)
    if result is None:
        return {}, warning
    return {module.id: module for module in result.modules}, None


def _generate_overview(
    analysis: CodebaseAnalysis,
    modules: list[ModuleExplanation],
    entry_points: list[str],
    external_dependencies: list[str],
) -> tuple[ProjectOverviewResult | None, str | None]:
    schema = json.dumps(ProjectOverviewResult.model_json_schema())
    facts = json.dumps(
        {
            "project_name": analysis.project_name,
            "languages": analysis.languages,
            "file_count": len(analysis.files),
            "line_count": analysis.line_count,
            "entry_points": entry_points,
            "external_dependencies": external_dependencies,
            "module_summaries": [{"id": m.id, "purpose": m.purpose} for m in modules if m.purpose],
        },
        indent=2,
    )
    prompt = build_structured_prompt(schema_description=schema, facts_json=facts, task=OVERVIEW_TASK)
    return generate_structured(prompt, ProjectOverviewResult)


def explain_project(
    analysis: CodebaseAnalysis, graph: DependencyGraph, *, max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS
) -> ProjectExplanation:
    entry_points = _derive_entry_points(analysis.files)
    external_dependencies = _external_dependencies(graph)
    file_tree = _build_file_tree(analysis.files)
    analyzable_files = [f for f in analysis.files if f.syntax_error is None]

    if not _is_groq_configured():
        return ProjectExplanation(
            languages=analysis.languages,
            entry_points=entry_points,
            external_dependencies=external_dependencies,
            confidence="low",
            file_tree=file_tree,
            modules=[_merge_module(f, None) for f in analyzable_files],
            warnings=[NOT_CONFIGURED_WARNING],
        )

    chunks = chunk_files_by_budget(analyzable_files, max_chunk_chars=max_chunk_chars)
    narratives_by_id: dict[str, ModuleNarrative] = {}
    warnings: list[str] = []

    for chunk in chunks:
        chunk_narratives, warning = explain_chunk(chunk.files)
        narratives_by_id.update(chunk_narratives)
        if warning:
            warnings.append(f"{chunk.chunk_id}: {warning}")

    modules = [_merge_module(f, narratives_by_id.get(f.module)) for f in analyzable_files]

    overview_result, overview_warning = _generate_overview(analysis, modules, entry_points, external_dependencies)
    if overview_warning:
        warnings.append(f"project-overview: {overview_warning}")

    return ProjectExplanation(
        project_summary=overview_result.project_summary if overview_result else "",
        architecture_overview=overview_result.architecture_overview if overview_result else "",
        languages=analysis.languages,
        entry_points=entry_points,
        external_dependencies=external_dependencies,
        confidence=overview_result.confidence if overview_result else "low",
        limitations=overview_result.limitations if overview_result else [],
        file_tree=file_tree,
        modules=modules,
        warnings=warnings,
    )
