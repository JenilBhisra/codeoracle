import zipfile

import pytest

from app.core.exceptions import (
    ExtractedTooLargeError,
    InvalidZipError,
    PasswordProtectedZipError,
    SymlinkNotAllowedError,
    TooManyFilesError,
    UploadTooLargeError,
    ZipSlipError,
)
from app.utils.zip_safety import safe_extract_zip, validate_upload_size
from tests.helpers import add_symlink_entry, make_zip


def test_validate_upload_size_allows_small_file(tmp_path):
    zip_path = make_zip(tmp_path / "small.zip", {"a.py": "print(1)\n"})

    validate_upload_size(zip_path, max_upload_mb=20)


def test_validate_upload_size_rejects_large_file(tmp_path):
    zip_path = tmp_path / "big.zip"
    zip_path.write_bytes(b"0" * (2 * 1024 * 1024))

    with pytest.raises(UploadTooLargeError):
        validate_upload_size(zip_path, max_upload_mb=1)


def test_safe_extract_zip_extracts_normal_project(tmp_path):
    zip_path = make_zip(
        tmp_path / "project.zip",
        {
            "project/app/main.py": "print('hi')\n",
            "project/README.md": "# hi\n",
        },
    )
    destination = tmp_path / "out"

    safe_extract_zip(zip_path, destination, max_files=100, max_extracted_bytes=10 * 1024 * 1024)

    assert (destination / "project" / "app" / "main.py").exists()
    assert (destination / "project" / "README.md").exists()


def test_safe_extract_zip_rejects_non_zip_file(tmp_path):
    fake_zip = tmp_path / "not_a_zip.zip"
    fake_zip.write_text("this is definitely not a zip archive")

    with pytest.raises(InvalidZipError):
        safe_extract_zip(fake_zip, tmp_path / "out", max_files=100, max_extracted_bytes=10_000_000)


def test_safe_extract_zip_rejects_relative_path_traversal(tmp_path):
    zip_path = make_zip(tmp_path / "evil.zip", {"../../evil.txt": "gotcha"})

    with pytest.raises(ZipSlipError):
        safe_extract_zip(zip_path, tmp_path / "out", max_files=100, max_extracted_bytes=10_000_000)


def test_safe_extract_zip_rejects_absolute_unix_path(tmp_path):
    zip_path = make_zip(tmp_path / "evil.zip", {"/etc/passwd": "gotcha"})

    with pytest.raises(ZipSlipError):
        safe_extract_zip(zip_path, tmp_path / "out", max_files=100, max_extracted_bytes=10_000_000)


def test_safe_extract_zip_rejects_windows_drive_path(tmp_path):
    zip_path = make_zip(tmp_path / "evil.zip", {"C:/Windows/evil.txt": "gotcha"})

    with pytest.raises(ZipSlipError):
        safe_extract_zip(zip_path, tmp_path / "out", max_files=100, max_extracted_bytes=10_000_000)


def test_safe_extract_zip_rejects_too_many_files(tmp_path):
    entries = {f"file_{i}.py": "x = 1\n" for i in range(10)}
    zip_path = make_zip(tmp_path / "many.zip", entries)

    with pytest.raises(TooManyFilesError):
        safe_extract_zip(zip_path, tmp_path / "out", max_files=5, max_extracted_bytes=10_000_000)


def test_safe_extract_zip_rejects_bomb_like_extracted_size(tmp_path):
    zip_path = make_zip(tmp_path / "bomb.zip", {"big.py": "x" * 1000})

    with pytest.raises(ExtractedTooLargeError):
        safe_extract_zip(zip_path, tmp_path / "out", max_files=100, max_extracted_bytes=100)


def test_safe_extract_zip_rejects_symlink_entries(tmp_path):
    zip_path = tmp_path / "symlink.zip"
    make_zip(zip_path, {"real.py": "x = 1\n"})
    add_symlink_entry(zip_path, "link.py", "/etc/passwd")

    with pytest.raises(SymlinkNotAllowedError):
        safe_extract_zip(zip_path, tmp_path / "out", max_files=100, max_extracted_bytes=10_000_000)


def test_safe_extract_zip_rejects_password_protected_zip(tmp_path, monkeypatch):
    # The stdlib zipfile module can't create genuinely encrypted archives on
    # write, so we simulate the RuntimeError it raises on read of an
    # encrypted entry without a password, and assert it's translated into
    # our own PasswordProtectedZipError.
    zip_path = make_zip(tmp_path / "protected.zip", {"secret.py": "print('hi')\n"})

    def fake_open(self, name, mode="r", pwd=None):
        raise RuntimeError("File 'secret.py' is encrypted, password required for extraction")

    monkeypatch.setattr(zipfile.ZipFile, "open", fake_open)

    with pytest.raises(PasswordProtectedZipError):
        safe_extract_zip(zip_path, tmp_path / "out", max_files=100, max_extracted_bytes=10_000_000)
