import zipfile
from pathlib import Path


def make_zip(zip_path: Path, entries: dict[str, str]) -> Path:
    """Create a ZIP at zip_path from a dict of {arcname: text_content}."""
    with zipfile.ZipFile(zip_path, "w") as zf:
        for arcname, content in entries.items():
            zf.writestr(arcname, content)
    return zip_path


def add_symlink_entry(zip_path: Path, arcname: str, target: str) -> None:
    """Append a ZIP entry flagged as a Unix symlink pointing at `target`."""
    with zipfile.ZipFile(zip_path, "a") as zf:
        info = zipfile.ZipInfo(arcname)
        info.external_attr = 0o120777 << 16
        zf.writestr(info, target)
