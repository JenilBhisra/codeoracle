from pathlib import Path

from app.utils.file_filters import detect_language, is_ignored_dir, is_ignored_file, looks_binary


def test_is_ignored_dir_matches_known_names():
    assert is_ignored_dir("node_modules") is True
    assert is_ignored_dir(".git") is True
    assert is_ignored_dir("__pycache__") is True
    assert is_ignored_dir("src") is False


def test_is_ignored_file_matches_minified_and_maps():
    assert is_ignored_file(Path("app.min.js")) is True
    assert is_ignored_file(Path("app.js.map")) is True
    assert is_ignored_file(Path("logo.png")) is True
    assert is_ignored_file(Path("main.py")) is False


def test_detect_language_maps_known_extensions():
    assert detect_language(Path("main.py")) == "python"
    assert detect_language(Path("index.js")) == "javascript"
    assert detect_language(Path("component.jsx")) == "javascript"
    assert detect_language(Path("README.md")) is None


def test_looks_binary_detects_null_bytes(tmp_path):
    binary_file = tmp_path / "data.bin"
    binary_file.write_bytes(b"\x00\x01\x02")
    assert looks_binary(binary_file) is True

    text_file = tmp_path / "code.py"
    text_file.write_text("print('hello')\n")
    assert looks_binary(text_file) is False
