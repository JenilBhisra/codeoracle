from dataclasses import dataclass, field
from pathlib import Path

from app.core.exceptions import NoSourceFilesError, TooManyLinesError
from app.utils.file_filters import detect_language, is_ignored_dir, is_ignored_file, looks_binary


@dataclass
class DiscoveredFile:
    path: str
    language: str
    line_count: int
    size_bytes: int


@dataclass
class IngestResult:
    project_name: str
    root_dir: Path
    files: list[DiscoveredFile]
    languages: list[str]
    total_line_count: int
    skipped_files: list[str] = field(default_factory=list)


def count_lines(file_path: Path) -> int:
    with open(file_path, "rb") as f:
        return sum(1 for _ in f)


def _effective_root(root_dir: Path) -> Path:
    """Collapse a single wrapping directory so relative paths (and the module
    ids derived from them) reflect the project's real root.

    GitHub's zip export always wraps a repo in a single `<repo>-<branch>/`
    directory, and zipping a project folder directly (a very common manual
    workflow) produces the same shape. Without this, every absolute import
    inside the project fails to resolve against the internal module ids,
    since the wrapper name is never part of the code's own import statements.
    """
    entries = [
        entry
        for entry in root_dir.iterdir()
        if not entry.name.startswith(".") and not (entry.is_dir() and is_ignored_dir(entry.name))
    ]
    if len(entries) == 1 and entries[0].is_dir():
        return entries[0]
    return root_dir


def discover_source_files(
    root_dir: Path, *, max_file_bytes: int, project_name: str | None = None
) -> IngestResult:
    root_dir = _effective_root(root_dir)
    files: list[DiscoveredFile] = []
    skipped: list[str] = []
    languages: set[str] = set()
    total_lines = 0

    for path in sorted(root_dir.rglob("*")):
        if path.is_dir():
            continue

        relative_parts = path.relative_to(root_dir).parts
        if any(is_ignored_dir(part) for part in relative_parts[:-1]):
            continue

        if is_ignored_file(path):
            continue

        language = detect_language(path)
        if language is None:
            continue

        try:
            size_bytes = path.stat().st_size
        except OSError:
            continue

        relative_path = path.relative_to(root_dir).as_posix()

        if size_bytes > max_file_bytes:
            skipped.append(relative_path)
            continue

        if looks_binary(path):
            skipped.append(relative_path)
            continue

        line_count = count_lines(path)
        files.append(
            DiscoveredFile(
                path=relative_path,
                language=language,
                line_count=line_count,
                size_bytes=size_bytes,
            )
        )
        languages.add(language)
        total_lines += line_count

    if not files:
        raise NoSourceFilesError("No supported Python or JavaScript source files were found.")

    return IngestResult(
        project_name=project_name or root_dir.name,
        root_dir=root_dir,
        files=files,
        languages=sorted(languages),
        total_line_count=total_lines,
        skipped_files=skipped,
    )


def enforce_line_limit(result: IngestResult, *, max_source_lines: int) -> None:
    if result.total_line_count > max_source_lines:
        raise TooManyLinesError(
            f"Project has {result.total_line_count} source lines, exceeding the {max_source_lines} limit."
        )
