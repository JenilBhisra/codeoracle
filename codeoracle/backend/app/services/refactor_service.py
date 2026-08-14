import json
from pathlib import Path

from app.core.config import settings
from app.models.codebase import CodebaseAnalysis, FileAnalysis
from app.models.refactor import RefactorProposal, RefactorProposalResponse
from app.services.gemini_structured import generate_structured
from app.services.prompt_templates import build_structured_prompt

NOT_CONFIGURED_WARNING = "Gemini is not configured (GEMINI_API_KEY/GEMINI_MODEL); refactor generation was skipped."

REFACTOR_TASK = (
    "Propose a modernized, refactored version of the ENTIRE source file "
    "shown in `source_code` below (return real, complete source code - not "
    "a diff or a partial snippet). Use the structured facts to understand "
    "its current imports, functions, and classes. Preserve observable "
    "behavior wherever possible. Explicitly check for and list ANY breaking "
    "changes to: function names, parameters, return types, exceptions "
    "raised, class names, module paths/imports, data formats, sync/async "
    "behavior, environment variables, configuration, side effects, and "
    "external API contracts - put every one you introduce in "
    "`breaking_changes`. Explain in `migration_notes` how a caller would "
    "need to adapt. Set `risk_level` to \"low\", \"medium\", or \"high\" "
    "based on how much observable behavior changes. This is a PROPOSAL ONLY "
    "that a human must review before applying - it will never be applied "
    "automatically, and the original file is never overwritten."
)


def _is_gemini_configured() -> bool:
    return bool(settings.gemini_api_key and settings.gemini_model)


def _read_source(root_dir: Path, file: FileAnalysis) -> str:
    return (root_dir / file.path).read_text(encoding="utf-8", errors="replace")


def generate_refactor_for_file(root_dir: Path, file: FileAnalysis) -> tuple[RefactorProposal | None, str | None]:
    if not file.functions and not file.classes:
        return None, None

    schema = json.dumps(RefactorProposalResponse.model_json_schema())
    facts = json.dumps(
        {
            "path": file.path,
            "language": file.language,
            "module": file.module,
            "imports": [i.model_dump() for i in file.imports],
            "functions": [f.model_dump() for f in file.functions],
            "classes": [c.model_dump() for c in file.classes],
            "source_code": _read_source(root_dir, file),
        },
        indent=2,
    )
    prompt = build_structured_prompt(schema_description=schema, facts_json=facts, task=REFACTOR_TASK)

    result, warning = generate_structured(prompt, RefactorProposalResponse)
    if result is None:
        return None, warning

    return (
        RefactorProposal(
            original_file=file.path,
            language=file.language,
            refactored_code=result.refactored_code,
            reason=result.reason,
            expected_benefit=result.expected_benefit,
            risk_level=result.risk_level,
            breaking_changes=result.breaking_changes,
            migration_notes=result.migration_notes,
            assumptions=result.assumptions,
            human_review_required=True,
        ),
        None,
    )


def generate_refactors_for_project(
    analysis: CodebaseAnalysis, root_dir: Path
) -> tuple[list[RefactorProposal], list[str]]:
    if not _is_gemini_configured():
        return [], [NOT_CONFIGURED_WARNING]

    proposals: list[RefactorProposal] = []
    warnings: list[str] = []

    for file in analysis.files:
        if file.syntax_error is not None:
            continue
        proposal, warning = generate_refactor_for_file(root_dir, file)
        if proposal is not None:
            proposals.append(proposal)
        if warning:
            warnings.append(f"{file.path}: {warning}")

    return proposals, warnings
