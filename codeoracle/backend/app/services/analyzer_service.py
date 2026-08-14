from pathlib import Path

from app.models.codebase import CodebaseAnalysis, FileAnalysis
from app.services.ingest_service import IngestResult
from app.services.js_analyzer import analyze_javascript_file
from app.services.python_analyzer import analyze_python_file

LANGUAGE_ANALYZERS = {
    "python": analyze_python_file,
    "javascript": analyze_javascript_file,
}


def _read_source(file_path: Path) -> str:
    return file_path.read_text(encoding="utf-8", errors="replace")


def analyze_codebase(ingest_result: IngestResult) -> CodebaseAnalysis:
    files: list[FileAnalysis] = []
    warnings: list[str] = []

    for discovered in ingest_result.files:
        analyzer = LANGUAGE_ANALYZERS.get(discovered.language)
        if analyzer is None:
            warnings.append(f"No analyzer available for language '{discovered.language}': {discovered.path}")
            continue

        source = _read_source(ingest_result.root_dir / discovered.path)
        analysis = analyzer(discovered.path, source, discovered.line_count)

        if analysis.syntax_error:
            warnings.append(f"Syntax error in {discovered.path}: {analysis.syntax_error}")

        files.append(analysis)

    for skipped_path in ingest_result.skipped_files:
        warnings.append(f"Skipped file (binary or too large): {skipped_path}")

    return CodebaseAnalysis(
        project_name=ingest_result.project_name,
        languages=ingest_result.languages,
        line_count=ingest_result.total_line_count,
        files=files,
        warnings=warnings,
    )
