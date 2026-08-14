from dataclasses import dataclass

from app.models.codebase import FileAnalysis

DEFAULT_MAX_CHUNK_CHARS = 6000


@dataclass
class FileChunk:
    chunk_id: str
    files: list[FileAnalysis]


def _file_size_estimate(file: FileAnalysis) -> int:
    return len(file.model_dump_json())


def chunk_files_by_budget(
    files: list[FileAnalysis], *, max_chunk_chars: int = DEFAULT_MAX_CHUNK_CHARS
) -> list[FileChunk]:
    """Group files for map-reduce style LLM processing.

    Sorting by path keeps files from the same directory/module adjacent
    (code-aware chunking) so related context tends to land in the same
    chunk. Greedily fills each chunk up to the character budget - a rough
    proxy for a token budget, cheap to compute and good enough for
    hackathon-scale projects. A single file that alone exceeds the budget
    still gets its own chunk rather than being dropped.
    """
    sorted_files = sorted(files, key=lambda f: f.path)

    chunks: list[FileChunk] = []
    current_files: list[FileAnalysis] = []
    current_size = 0

    for file in sorted_files:
        file_size = _file_size_estimate(file)

        if current_files and current_size + file_size > max_chunk_chars:
            chunks.append(FileChunk(chunk_id=f"chunk-{len(chunks)}", files=current_files))
            current_files = []
            current_size = 0

        current_files.append(file)
        current_size += file_size

    if current_files:
        chunks.append(FileChunk(chunk_id=f"chunk-{len(chunks)}", files=current_files))

    return chunks
