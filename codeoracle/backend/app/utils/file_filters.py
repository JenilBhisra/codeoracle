from pathlib import Path

from app.core.constants import (
    IGNORED_DIR_NAMES,
    IGNORED_FILE_EXTENSIONS,
    IGNORED_FILENAME_SUFFIXES,
    SUPPORTED_LANGUAGE_EXTENSIONS,
)


def is_ignored_dir(dir_name: str) -> bool:
    return dir_name in IGNORED_DIR_NAMES


def is_ignored_file(path: Path) -> bool:
    name = path.name.lower()
    if name.endswith(IGNORED_FILENAME_SUFFIXES):
        return True
    return path.suffix.lower() in IGNORED_FILE_EXTENSIONS


def detect_language(path: Path) -> str | None:
    return SUPPORTED_LANGUAGE_EXTENSIONS.get(path.suffix.lower())


def looks_binary(file_path: Path, sample_size: int = 8000) -> bool:
    try:
        with open(file_path, "rb") as f:
            chunk = f.read(sample_size)
    except OSError:
        return True
    return b"\x00" in chunk
