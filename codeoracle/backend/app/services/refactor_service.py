import json
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from app.core.config import settings
from app.models.codebase import CodebaseAnalysis, FileAnalysis
from app.models.refactor import RefactorChunkResponse, RefactorProposal
from app.services.chunking import DEFAULT_MAX_CHUNK_CHARS, chunk_files_by_budget
from app.services.groq_structured import generate_structured
from app.services.prompt_templates import build_structured_prompt

logger = logging.getLogger(__name__)

NOT_CONFIGURED_WARNING = "Groq is not configured (GROQ_API_KEY/GROQ_MODEL); refactor generation was skipped."

REFACTOR_CHUNK_TASK = (
    "For EACH file in the facts above, propose a modernized, refactored "
    "version of the ENTIRE source file shown in its `source_code` (return "
    "real, complete source code - not a diff or a partial snippet). Use the "
    "structured facts to understand its current imports, functions, and "
    "classes. Preserve observable behavior wherever possible. Explicitly "
    "check for and list ANY breaking changes to: function names, "
    "parameters, return types, exceptions raised, class names, module "
    "paths/imports, data formats, sync/async behavior, environment "
    "variables, configuration, side effects, and external API contracts - "
    "put every one you introduce in `breaking_changes`, and list the "
    "matching categories (from the fixed set given in the schema) in "
    "`impact_areas`. Explain in `migration_notes` how a caller would need "
    "to adapt. Set `risk` to \"low\", \"medium\", or \"high\" based on how "
    "much observable behavior changes. Return one entry per file in "
    "`files`, with `path` set to that file's `path` value from the facts. "
    "This is a PROPOSAL ONLY that a human must review before applying - it "
    "will never be applied automatically, and the original file is never "
    "overwritten."
)


def _is_groq_configured() -> bool:
    return bool(settings.groq_api_key and settings.groq_model)


def _read_source(root_dir: Path, file: FileAnalysis) -> str:
    return (root_dir / file.path).read_text(encoding="utf-8", errors="replace")


def generate_refactors_for_chunk(
    files: list[FileAnalysis], sources: dict[str, str]
) -> tuple[dict[str, RefactorProposal], str | None]:
    """One Groq call covering multiple files' refactor proposals at once."""
    schema = json.dumps(RefactorChunkResponse.model_json_schema())
    facts = json.dumps(
        [
            {
                "path": file.path,
                "language": file.language,
                "module": file.module,
                "imports": [i.model_dump() for i in file.imports],
                "functions": [f.model_dump() for f in file.functions],
                "classes": [c.model_dump() for c in file.classes],
                "source_code": sources[file.path],
            }
            for file in files
        ],
        indent=2,
    )
    prompt = build_structured_prompt(schema_description=schema, facts_json=facts, task=REFACTOR_CHUNK_TASK)

    result, warning = generate_structured(prompt, RefactorChunkResponse)
    if result is None:
        return {}, warning

    proposals_by_path = {
        response.path: RefactorProposal(
            id=uuid.uuid4().hex[:10],
            path=response.path,
            language=next((f.language for f in files if f.path == response.path), ""),
            risk=response.risk,
            summary=response.summary,
            benefit=response.benefit,
            breaking_changes=response.breaking_changes,
            migration_notes=response.migration_notes,
            assumptions=response.assumptions,
            impact_areas=response.impact_areas,
            requires_human_review=True,
            original_code=sources.get(response.path, ""),
            refactored_code=response.refactored_code,
        )
        for response in result.files
    }
    return proposals_by_path, None


def generate_refactors_for_project(
    analysis: CodebaseAnalysis, root_dir: Path, *, max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS
) -> tuple[list[RefactorProposal], list[str]]:
    if not _is_groq_configured():
        return [], [NOT_CONFIGURED_WARNING]

    refactorable = [f for f in analysis.files if f.syntax_error is None and (f.functions or f.classes)]
    if not refactorable:
        return [], []

    sources = {file.path: _read_source(root_dir, file) for file in refactorable}

    def _chunk_size(file: FileAnalysis) -> int:
        return len(file.model_dump_json()) + len(sources[file.path])

    chunks = chunk_files_by_budget(refactorable, max_chunk_chars=max_chunk_chars, size_of=_chunk_size)

    proposals: list[RefactorProposal] = []
    warnings: list[str] = []

    # Chunks are independent Groq calls, so run them concurrently (bounded by
    # GROQ_MAX_CONCURRENCY) instead of one at a time - submitting all of them
    # up front starts them all immediately, then processing results in the
    # original chunk order keeps output deterministic regardless of which
    # call actually finishes first.
    with ThreadPoolExecutor(max_workers=settings.groq_max_concurrency) as executor:
        futures = [executor.submit(generate_refactors_for_chunk, chunk.files, sources) for chunk in chunks]
        for chunk, future in zip(chunks, futures):
            try:
                proposals_by_path, warning = future.result()
            except Exception:
                logger.exception("Unexpected error generating refactors for chunk %s", chunk.chunk_id)
                warnings.append(f"{chunk.chunk_id}: unexpected error during refactor generation")
                continue
            if warning:
                warnings.append(f"{chunk.chunk_id}: {warning}")
                continue
            for file in chunk.files:
                proposal = proposals_by_path.get(file.path)
                if proposal is None:
                    warnings.append(f"{file.path}: Groq did not return a refactor proposal for this path")
                    continue
                proposals.append(proposal)

    return proposals, warnings
