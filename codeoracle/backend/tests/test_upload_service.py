import pytest

from app.core.exceptions import TooManyLinesError, UploadTooLargeError
from app.services.upload_service import process_zip_source
from tests.helpers import make_zip


def test_process_zip_source_mixed_language_project(tmp_path):
    zip_path = make_zip(
        tmp_path / "project.zip",
        {
            "project/app.py": "import os\nprint(os.getcwd())\n",
            "project/util.js": "function add(a, b) {\n  return a + b;\n}\n",
            "project/node_modules/pkg/index.js": "module.exports = {};\n",
            "project/logo.png": "not really a png but has a png extension",
        },
    )

    result = process_zip_source(zip_path, tmp_path / "extracted")

    assert result.languages == ["javascript", "python"]
    paths = {f.path for f in result.files}
    assert paths == {"project/app.py", "project/util.js"}


def test_process_zip_source_respects_upload_size_setting(tmp_path, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "max_upload_mb", 0)
    zip_path = make_zip(tmp_path / "project.zip", {"app.py": "print(1)\n"})

    with pytest.raises(UploadTooLargeError):
        process_zip_source(zip_path, tmp_path / "extracted")


def test_process_zip_source_respects_line_limit_setting(tmp_path, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "max_source_lines", 2)
    zip_path = make_zip(tmp_path / "project.zip", {"app.py": "x = 1\n" * 10})

    with pytest.raises(TooManyLinesError):
        process_zip_source(zip_path, tmp_path / "extracted")
