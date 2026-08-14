import pytest

from app.core.exceptions import NoSourceFilesError, TooManyLinesError
from app.services.ingest_service import discover_source_files, enforce_line_limit


def test_discover_source_files_finds_python_and_js(tmp_path):
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "main.py").write_text("import os\nprint(os.getcwd())\n")
    (tmp_path / "app" / "util.js").write_text("function add(a, b) {\n  return a + b;\n}\n")

    result = discover_source_files(tmp_path, max_file_bytes=500_000)

    assert result.languages == ["javascript", "python"]
    assert {f.path for f in result.files} == {"app/main.py", "app/util.js"}
    assert result.total_line_count == 5


def test_discover_source_files_skips_ignored_dirs(tmp_path):
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "pkg.js").write_text("module.exports = {};\n")
    (tmp_path / "app.py").write_text("print(1)\n")

    result = discover_source_files(tmp_path, max_file_bytes=500_000)

    assert [f.path for f in result.files] == ["app.py"]


def test_discover_source_files_skips_oversized_files(tmp_path):
    (tmp_path / "small.py").write_text("print(1)\n")
    (tmp_path / "huge.py").write_text("x = 1\n" * 100)

    result = discover_source_files(tmp_path, max_file_bytes=20)

    assert [f.path for f in result.files] == ["small.py"]
    assert result.skipped_files == ["huge.py"]


def test_discover_source_files_raises_when_no_source_files(tmp_path):
    (tmp_path / "README.md").write_text("# hello\n")

    with pytest.raises(NoSourceFilesError):
        discover_source_files(tmp_path, max_file_bytes=500_000)


def test_enforce_line_limit_raises_when_exceeded(tmp_path):
    (tmp_path / "big.py").write_text("x = 1\n" * 20)
    result = discover_source_files(tmp_path, max_file_bytes=500_000)

    with pytest.raises(TooManyLinesError):
        enforce_line_limit(result, max_source_lines=10)


def test_enforce_line_limit_allows_within_limit(tmp_path):
    (tmp_path / "small.py").write_text("x = 1\n" * 5)
    result = discover_source_files(tmp_path, max_file_bytes=500_000)

    enforce_line_limit(result, max_source_lines=10)
