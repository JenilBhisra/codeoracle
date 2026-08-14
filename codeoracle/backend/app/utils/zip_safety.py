import zipfile
from pathlib import Path

from app.core.exceptions import (
    ExtractedTooLargeError,
    InvalidZipError,
    PasswordProtectedZipError,
    SymlinkNotAllowedError,
    TooManyFilesError,
    UploadTooLargeError,
    ZipSlipError,
)

MB = 1024 * 1024
UNIX_MODE_MASK = 0o170000
UNIX_SYMLINK_MODE = 0o120000


def validate_upload_size(file_path: Path, max_upload_mb: int) -> None:
    size_bytes = file_path.stat().st_size
    max_bytes = max_upload_mb * MB
    if size_bytes > max_bytes:
        raise UploadTooLargeError(
            f"Uploaded file is {size_bytes} bytes, exceeding the {max_upload_mb}MB limit."
        )


def open_zip_safely(zip_path: Path) -> zipfile.ZipFile:
    if not zipfile.is_zipfile(zip_path):
        raise InvalidZipError("The uploaded file is not a valid ZIP archive.")
    try:
        return zipfile.ZipFile(zip_path)
    except zipfile.BadZipFile as exc:
        raise InvalidZipError("The uploaded file is not a valid ZIP archive.") from exc


def _resolve_within(base_dir: Path, member_name: str) -> Path:
    normalized = member_name.replace("\\", "/")
    first_segment = normalized.split("/", 1)[0]

    # Reject absolute paths and Windows drive-letter paths before ever
    # joining them, so a crafted entry can't escape base_dir on either OS.
    if normalized.startswith("/") or ":" in first_segment:
        raise ZipSlipError(f"Unsafe absolute path in archive: {member_name}")

    target = (base_dir / normalized).resolve()
    base_resolved = base_dir.resolve()

    if target != base_resolved and base_resolved not in target.parents:
        raise ZipSlipError(f"Unsafe path in archive: {member_name}")

    return target


def _is_symlink_entry(info: zipfile.ZipInfo) -> bool:
    # external_attr's upper 16 bits only hold a Unix file mode when the
    # archive was created on a Unix-like system; Windows-created zips won't
    # trip this, which is an accepted limitation for the hackathon scope.
    unix_mode = info.external_attr >> 16
    return (unix_mode & UNIX_MODE_MASK) == UNIX_SYMLINK_MODE


def safe_extract_zip(
    zip_path: Path,
    destination: Path,
    *,
    max_files: int,
    max_extracted_bytes: int,
) -> Path:
    destination.mkdir(parents=True, exist_ok=True)

    with open_zip_safely(zip_path) as zf:
        infolist = zf.infolist()

        if len(infolist) > max_files:
            raise TooManyFilesError(
                f"Archive contains {len(infolist)} entries, exceeding the limit of {max_files}."
            )

        total_uncompressed = sum(info.file_size for info in infolist)
        if total_uncompressed > max_extracted_bytes:
            raise ExtractedTooLargeError(
                "Extracted project would exceed the maximum allowed size."
            )

        for info in infolist:
            if _is_symlink_entry(info):
                raise SymlinkNotAllowedError(
                    f"Symbolic links are not allowed in uploaded archives: {info.filename}"
                )

            target_path = _resolve_within(destination, info.filename)

            if info.is_dir():
                target_path.mkdir(parents=True, exist_ok=True)
                continue

            target_path.parent.mkdir(parents=True, exist_ok=True)

            try:
                with zf.open(info) as source, open(target_path, "wb") as out_file:
                    out_file.write(source.read())
            except RuntimeError as exc:
                # zipfile raises RuntimeError (not a dedicated exception type)
                # when an entry is encrypted and no password was supplied.
                raise PasswordProtectedZipError(
                    "This ZIP file is password-protected and cannot be processed."
                ) from exc

    return destination
