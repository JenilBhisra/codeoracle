from app.services.analyzer_service import analyze_codebase
from app.services.ingest_service import discover_source_files


def test_analyze_codebase_handles_mixed_language_project(tmp_path):
    (tmp_path / "app.py").write_text("def hello():\n    return 'hi'\n")
    (tmp_path / "util.js").write_text("function add(a, b) {\n  return a + b;\n}\n")

    ingest_result = discover_source_files(tmp_path, max_file_bytes=500_000)
    analysis = analyze_codebase(ingest_result)

    assert set(analysis.languages) == {"python", "javascript"}
    assert len(analysis.files) == 2
    assert analysis.warnings == []


def test_analyze_codebase_records_syntax_error_as_warning_and_continues(tmp_path):
    (tmp_path / "broken.py").write_text("def broken(:\n    pass\n")
    (tmp_path / "fine.py").write_text("def fine():\n    return 1\n")

    ingest_result = discover_source_files(tmp_path, max_file_bytes=500_000)
    analysis = analyze_codebase(ingest_result)

    assert len(analysis.files) == 2
    broken_file = next(f for f in analysis.files if f.path == "broken.py")
    fine_file = next(f for f in analysis.files if f.path == "fine.py")
    assert broken_file.syntax_error is not None
    assert fine_file.syntax_error is None
    assert any("broken.py" in w for w in analysis.warnings)


def test_analyze_codebase_records_skipped_files_as_warnings(tmp_path):
    (tmp_path / "small.py").write_text("print(1)\n")
    (tmp_path / "huge.py").write_text("x = 1\n" * 100)

    ingest_result = discover_source_files(tmp_path, max_file_bytes=20)
    analysis = analyze_codebase(ingest_result)

    assert len(analysis.files) == 1
    assert any("huge.py" in w for w in analysis.warnings)
