from pathlib import Path

from app.core.config import settings
from app.services.ingest_service import IngestResult, discover_source_files, enforce_line_limit
from app.utils.zip_safety import safe_extract_zip, validate_upload_size


def process_zip_source(zip_path: Path, extract_to: Path) -> IngestResult:
    """Validate, safely extract, and discover source files from a ZIP archive.

    Shared by both the direct-upload flow and the GitHub-download flow, since
    both ultimately hand this function a ZIP file sitting on disk.
    """
    validate_upload_size(zip_path, settings.max_upload_mb)

    max_extracted_bytes = settings.max_extracted_mb * 1024 * 1024
    safe_extract_zip(
        zip_path,
        extract_to,
        max_files=settings.max_files,
        max_extracted_bytes=max_extracted_bytes,
    )

    result = discover_source_files(extract_to, max_file_bytes=settings.max_file_bytes)
    enforce_line_limit(result, max_source_lines=settings.max_source_lines)
    return result
