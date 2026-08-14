from app.services.chunking import chunk_files_by_budget
from app.services.python_analyzer import analyze_python_file


def _file(path, body="def f():\n    pass\n"):
    return analyze_python_file(path, body, line_count=body.count("\n"))


def test_chunk_files_by_budget_groups_small_files_together():
    files = [_file(f"app/mod{i}.py") for i in range(6)]

    chunks = chunk_files_by_budget(files, max_chunk_chars=2000)

    assert len(chunks) == 1
    assert len(chunks[0].files) == 6


def test_chunk_files_by_budget_splits_when_exceeding_budget():
    files = [_file(f"app/mod{i}.py") for i in range(10)]

    chunks = chunk_files_by_budget(files, max_chunk_chars=400)

    assert len(chunks) > 1
    assert sum(len(c.files) for c in chunks) == len(files)


def test_chunk_files_by_budget_never_drops_an_oversized_single_file():
    huge_body = "def f():\n    pass\n" * 500
    files = [_file("app/huge.py", huge_body)]

    chunks = chunk_files_by_budget(files, max_chunk_chars=10)

    assert len(chunks) == 1
    assert len(chunks[0].files) == 1


def test_chunk_files_by_budget_sorts_files_by_path():
    files = [_file("z.py"), _file("a.py"), _file("m.py")]

    chunks = chunk_files_by_budget(files, max_chunk_chars=10_000)

    assert [f.path for f in chunks[0].files] == ["a.py", "m.py", "z.py"]


def test_chunk_ids_are_unique():
    files = [_file(f"app/mod{i}.py") for i in range(10)]

    chunks = chunk_files_by_budget(files, max_chunk_chars=300)

    ids = [c.chunk_id for c in chunks]
    assert len(ids) == len(set(ids))
