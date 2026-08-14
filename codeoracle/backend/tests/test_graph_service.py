from app.models.codebase import CodebaseAnalysis
from app.services.graph_service import build_dependency_graph
from app.services.js_analyzer import analyze_javascript_file
from app.services.python_analyzer import analyze_python_file


def _analysis(files, languages=None):
    return CodebaseAnalysis(
        project_name="demo",
        languages=languages or [],
        line_count=sum(f.line_count for f in files),
        files=files,
        warnings=[],
    )


# --- Python resolution -------------------------------------------------


def test_graph_resolves_plain_absolute_import():
    files = [
        analyze_python_file("app/main.py", "import app.utils\n", line_count=1),
        analyze_python_file("app/utils.py", "def thing():\n    pass\n", line_count=2),
    ]
    graph = build_dependency_graph(_analysis(files))

    assert any(e.source == "app.main" and e.target == "app.utils" and e.type == "imports" for e in graph.edges)


def test_graph_resolves_from_import_submodule():
    files = [
        analyze_python_file("app/main.py", "from app.services import upload_service\n", line_count=1),
        analyze_python_file("app/services/upload_service.py", "def process():\n    pass\n", line_count=2),
        analyze_python_file("app/services/__init__.py", "", line_count=0),
    ]
    graph = build_dependency_graph(_analysis(files))

    assert any(
        e.source == "app.main" and e.target == "app.services.upload_service" and e.type == "imports"
        for e in graph.edges
    )


def test_graph_resolves_relative_import_dot():
    files = [
        analyze_python_file("app/main.py", "from . import helpers\n", line_count=1),
        analyze_python_file("app/__init__.py", "", line_count=0),
    ]
    graph = build_dependency_graph(_analysis(files))

    assert any(e.source == "app.main" and e.target == "app" and e.type == "imports" for e in graph.edges)


def test_graph_resolves_relative_import_with_submodule():
    files = [
        analyze_python_file("app/services/main.py", "from .utils import thing\n", line_count=1),
        analyze_python_file("app/services/utils.py", "def thing():\n    pass\n", line_count=2),
    ]
    graph = build_dependency_graph(_analysis(files))

    assert any(
        e.source == "app.services.main" and e.target == "app.services.utils" and e.type == "imports"
        for e in graph.edges
    )


def test_graph_resolves_relative_import_parent_package():
    files = [
        analyze_python_file("app/services/main.py", "from .. import config\n", line_count=1),
        analyze_python_file("app/__init__.py", "", line_count=0),
    ]
    graph = build_dependency_graph(_analysis(files))

    assert any(e.source == "app.services.main" and e.target == "app" and e.type == "imports" for e in graph.edges)


def test_graph_creates_external_node_and_edge_for_stdlib_import():
    files = [analyze_python_file("app/main.py", "import os\n", line_count=1)]
    graph = build_dependency_graph(_analysis(files))

    external_nodes = [n for n in graph.nodes if n.external]
    assert any(n.id == "os" for n in external_nodes)
    assert any(e.source == "app.main" and e.target == "os" for e in graph.edges)


def test_graph_flags_unresolved_relative_import_as_warning():
    files = [analyze_python_file("app/main.py", "from .missing import thing\n", line_count=1)]
    graph = build_dependency_graph(_analysis(files))

    assert graph.edges == []
    assert any("Unresolved relative import" in w for w in graph.warnings)


def test_graph_excludes_syntax_error_files_and_warns():
    files = [
        analyze_python_file("app/broken.py", "def broken(:", line_count=1),
        analyze_python_file("app/fine.py", "import os\n", line_count=1),
    ]
    graph = build_dependency_graph(_analysis(files))

    assert all(n.id != "app.broken" for n in graph.nodes)
    assert any("app/broken.py" in w for w in graph.warnings)


# --- JavaScript resolution ----------------------------------------------


def test_graph_resolves_js_relative_sibling_import():
    files = [
        analyze_javascript_file("src/index.js", 'import { helper } from "./helpers";\n', line_count=1),
        analyze_javascript_file("src/helpers.js", "export function helper() {}\n", line_count=1),
    ]
    graph = build_dependency_graph(_analysis(files))

    assert any(e.source == "src/index" and e.target == "src/helpers" and e.type == "imports" for e in graph.edges)


def test_graph_resolves_js_relative_parent_directory_import():
    files = [
        analyze_javascript_file("src/components/widget.js", 'const utils = require("../utils");\n', line_count=1),
        analyze_javascript_file("src/utils.js", "module.exports.utils = {};\n", line_count=1),
    ]
    graph = build_dependency_graph(_analysis(files))

    assert any(
        e.source == "src/components/widget" and e.target == "src/utils" and e.type == "imports" for e in graph.edges
    )


def test_graph_creates_external_node_for_js_package():
    files = [analyze_javascript_file("src/index.js", 'import React from "react";\n', line_count=1)]
    graph = build_dependency_graph(_analysis(files))

    external_nodes = [n for n in graph.nodes if n.external]
    assert any(n.id == "react" for n in external_nodes)


def test_graph_dedupes_external_node_shared_by_multiple_files():
    files = [
        analyze_javascript_file("src/a.js", 'import React from "react";\n', line_count=1),
        analyze_javascript_file("src/b.js", 'import { useState } from "react";\n', line_count=1),
    ]
    graph = build_dependency_graph(_analysis(files))

    react_nodes = [n for n in graph.nodes if n.id == "react"]
    assert len(react_nodes) == 1


def test_graph_flags_unresolved_js_relative_import():
    files = [analyze_javascript_file("src/index.js", 'import { x } from "./missing";\n', line_count=1)]
    graph = build_dependency_graph(_analysis(files))

    assert graph.edges == []
    assert any("Unresolved relative import" in w for w in graph.warnings)


# --- Deduplication and call edges ----------------------------------------


def test_graph_does_not_duplicate_edges_for_repeated_imports():
    files = [
        analyze_python_file("app/main.py", "import os\nimport os\n", line_count=2),
        ]
    graph = build_dependency_graph(_analysis(files))

    matching = [e for e in graph.edges if e.source == "app.main" and e.target == "os"]
    assert len(matching) == 1


def test_graph_builds_call_edge_only_for_resolved_internal_import():
    files = [
        analyze_python_file(
            "app/main.py",
            "from .utils import thing\n\ndef run():\n    thing()\n",
            line_count=4,
        ),
        analyze_python_file("app/utils.py", "def thing():\n    pass\n", line_count=2),
    ]
    graph = build_dependency_graph(_analysis(files))

    call_edges = [e for e in graph.edges if e.type == "calls"]
    assert any(e.source == "app.main" and e.target == "app.utils" for e in call_edges)


def test_graph_node_ids_and_edge_ids_are_stable_and_unique():
    files = [analyze_python_file("app/main.py", "import os\n", line_count=1)]
    graph = build_dependency_graph(_analysis(files))

    edge_ids = [e.id for e in graph.edges]
    assert len(edge_ids) == len(set(edge_ids))
    assert graph.edges[0].id == "app.main-os-external"
