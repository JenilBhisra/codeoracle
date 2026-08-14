import posixpath
from pathlib import Path

from app.models.codebase import CodebaseAnalysis, FileAnalysis, ImportInfo
from app.models.graph import DependencyGraph, GraphEdge, GraphNode

JS_RELATIVE_SUFFIXES = (".js", ".jsx", ".mjs", ".cjs")


# --- Python import resolution ----------------------------------------------


def _python_containing_package(relative_path: str) -> str:
    """The package a file's relative imports are resolved against.

    Works for both regular modules and `__init__.py` files: dropping just the
    filename gives the right answer in both cases, since a package's own
    containing directory *is* its package name.
    """
    parts = Path(relative_path).parts[:-1]
    return ".".join(parts)


def _resolve_relative_python_base(containing_package: str, module: str) -> str:
    dots = 0
    while dots < len(module) and module[dots] == ".":
        dots += 1
    remainder = module[dots:]

    package_parts = containing_package.split(".") if containing_package else []
    levels_to_drop = dots - 1
    if levels_to_drop > 0:
        package_parts = package_parts[:-levels_to_drop] if levels_to_drop <= len(package_parts) else []
    base = ".".join(package_parts)

    if remainder:
        return f"{base}.{remainder}" if base else remainder
    return base


def resolve_python_import_targets(file: FileAnalysis, imp: ImportInfo, internal_module_ids: set[str]) -> list[str]:
    """Return internal module ids this import resolves to (usually 0 or 1).

    Handles both `import x.y` / relative whole-module imports (base itself is
    the target) and `from x import y` style imports, where `y` might be a
    submodule of `x` (e.g. `from app.services import upload_service` where
    upload_service.py is a sibling file) or a name defined inside `x`'s own
    __init__.py - both are legitimate and we check both.
    """
    if imp.is_relative:
        containing_package = _python_containing_package(file.path)
        base = _resolve_relative_python_base(containing_package, imp.module)
    else:
        base = imp.module

    if not imp.imported_names:
        return [base] if base in internal_module_ids else []

    targets = []
    for name in imp.imported_names:
        submodule = f"{base}.{name}" if base else name
        if submodule in internal_module_ids:
            targets.append(submodule)
        elif base in internal_module_ids:
            targets.append(base)
    return targets


def python_external_package_name(module: str) -> str:
    return module.split(".")[0]


# --- JavaScript import resolution -------------------------------------------


def _strip_js_suffix(path: str) -> str:
    for suffix in JS_RELATIVE_SUFFIXES:
        if path.endswith(suffix):
            return path[: -len(suffix)]
    return path


def resolve_js_import_target(file: FileAnalysis, imp: ImportInfo, internal_module_ids: set[str]) -> str | None:
    file_dir = posixpath.dirname(file.path)
    combined = posixpath.normpath(posixpath.join(file_dir, imp.module))
    combined = combined.replace("\\", "/")

    candidates = [combined, _strip_js_suffix(combined), f"{combined}/index"]
    for candidate in candidates:
        if candidate in internal_module_ids:
            return candidate
    return None


def js_external_package_name(module: str) -> str:
    if module.startswith("@"):
        parts = module.split("/")
        return "/".join(parts[:2]) if len(parts) >= 2 else module
    return module.split("/")[0]


# --- Graph building -----------------------------------------------------


def _module_node(file: FileAnalysis) -> GraphNode:
    return GraphNode(
        id=file.module,
        label=file.module,
        type="module",
        language=file.language,
        path=file.path,
        external=False,
    )


def _external_node(package_name: str, language: str) -> GraphNode:
    return GraphNode(
        id=package_name,
        label=package_name,
        type="external",
        language=language,
        path=None,
        external=True,
    )


def build_dependency_graph(analysis: CodebaseAnalysis) -> DependencyGraph:
    files_by_module = {f.module: f for f in analysis.files if f.syntax_error is None}
    internal_module_ids = set(files_by_module.keys())

    nodes: dict[str, GraphNode] = {module: _module_node(f) for module, f in files_by_module.items()}
    edges: dict[tuple[str, str, str], GraphEdge] = {}
    warnings: list[str] = []

    def add_edge(source: str, target: str, edge_type: str) -> None:
        key = (source, target, edge_type)
        if key in edges:
            return
        edges[key] = GraphEdge(id=f"{source}-{target}-{edge_type}", source=source, target=target, type=edge_type)

    # imports
    for module, file in files_by_module.items():
        for imp in file.imports:
            if file.language == "python":
                targets = resolve_python_import_targets(file, imp, internal_module_ids)
                if targets:
                    for target in targets:
                        add_edge(module, target, "imports")
                    continue
                if imp.is_relative:
                    warnings.append(f"Unresolved relative import in {file.path}: {imp.module}")
                    continue
                external_id = python_external_package_name(imp.module)
                nodes.setdefault(external_id, _external_node(external_id, "python"))
                add_edge(module, external_id, "imports")

            elif file.language == "javascript":
                if imp.is_relative:
                    target = resolve_js_import_target(file, imp, internal_module_ids)
                    if target is None:
                        warnings.append(f"Unresolved relative import in {file.path}: {imp.module}")
                        continue
                    add_edge(module, target, "imports")
                else:
                    external_id = js_external_package_name(imp.module)
                    nodes.setdefault(external_id, _external_node(external_id, "javascript"))
                    add_edge(module, external_id, "imports")

    # calls: only for names that resolve to an internal module via this
    # file's own confirmed imports, so we never invent a target.
    for module, file in files_by_module.items():
        imported_name_to_module: dict[str, str] = {}
        for imp in file.imports:
            targets = (
                resolve_python_import_targets(file, imp, internal_module_ids)
                if file.language == "python"
                else ([t] if imp.is_relative and (t := resolve_js_import_target(file, imp, internal_module_ids)) else [])
            )
            for target in targets:
                for name in imp.imported_names or [target]:
                    imported_name_to_module[name] = target

        all_calls = {c for fn in file.functions for c in fn.calls}
        for cls in file.classes:
            for method in cls.methods:
                all_calls.update(method.calls)

        for call_name in all_calls:
            target_module = imported_name_to_module.get(call_name)
            if target_module:
                add_edge(module, target_module, "calls")

    for skipped_path in [f.path for f in analysis.files if f.syntax_error is not None]:
        warnings.append(f"Excluded from dependency graph (syntax error): {skipped_path}")

    return DependencyGraph(nodes=list(nodes.values()), edges=list(edges.values()), warnings=warnings)
