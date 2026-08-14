import ast
from pathlib import Path

from app.models.codebase import ClassInfo, FileAnalysis, FunctionInfo, ImportInfo, ParameterInfo


def _unparse(node: ast.AST | None) -> str | None:
    if node is None:
        return None
    try:
        return ast.unparse(node)
    except Exception:
        return None


def _decorator_names(decorator_list: list[ast.expr]) -> list[str]:
    return [name for dec in decorator_list if (name := _unparse(dec))]


def _extract_parameters(args: ast.arguments) -> list[ParameterInfo]:
    params: list[ParameterInfo] = []

    positional = list(args.posonlyargs) + list(args.args)
    default_offset = len(positional) - len(args.defaults)

    for i, arg in enumerate(positional):
        default_node = args.defaults[i - default_offset] if i >= default_offset else None
        params.append(
            ParameterInfo(
                name=arg.arg,
                annotation=_unparse(arg.annotation),
                default=_unparse(default_node),
            )
        )

    if args.vararg:
        params.append(ParameterInfo(name=f"*{args.vararg.arg}", annotation=_unparse(args.vararg.annotation)))

    for kwarg, default_node in zip(args.kwonlyargs, args.kw_defaults):
        params.append(
            ParameterInfo(
                name=kwarg.arg,
                annotation=_unparse(kwarg.annotation),
                default=_unparse(default_node),
            )
        )

    if args.kwarg:
        params.append(ParameterInfo(name=f"**{args.kwarg.arg}", annotation=_unparse(args.kwarg.annotation)))

    return params


def _extract_calls(node: ast.AST) -> list[str]:
    calls: set[str] = set()
    for child in ast.walk(node):
        if isinstance(child, ast.Call):
            func = child.func
            if isinstance(func, ast.Name):
                calls.add(func.id)
            elif isinstance(func, ast.Attribute):
                calls.add(func.attr)
    return sorted(calls)


_BRANCH_NODE_TYPES = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.Try)


def _count_branches(node: ast.AST) -> int:
    return sum(1 for child in ast.walk(node) if isinstance(child, _BRANCH_NODE_TYPES))


def _build_function_info(node: ast.FunctionDef | ast.AsyncFunctionDef) -> FunctionInfo:
    return FunctionInfo(
        name=node.name,
        parameters=_extract_parameters(node.args),
        return_annotation=_unparse(node.returns),
        is_async=isinstance(node, ast.AsyncFunctionDef),
        decorators=_decorator_names(node.decorator_list),
        docstring=ast.get_docstring(node),
        calls=_extract_calls(node),
        branch_count=_count_branches(node),
        line_start=node.lineno,
        line_end=getattr(node, "end_lineno", None),
    )


def _build_class_info(node: ast.ClassDef) -> ClassInfo:
    methods = [
        _build_function_info(item)
        for item in node.body
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]

    return ClassInfo(
        name=node.name,
        bases=[name for base in node.bases if (name := _unparse(base))],
        decorators=_decorator_names(node.decorator_list),
        docstring=ast.get_docstring(node),
        methods=methods,
        line_start=node.lineno,
        line_end=getattr(node, "end_lineno", None),
    )


def _extract_imports(tree: ast.Module) -> list[ImportInfo]:
    imports: list[ImportInfo] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(
                    ImportInfo(
                        module=alias.name,
                        imported_names=[],
                        alias=alias.asname,
                        is_relative=False,
                        line=node.lineno,
                    )
                )
        elif isinstance(node, ast.ImportFrom):
            level = node.level or 0
            module = ("." * level) + (node.module or "")
            imports.append(
                ImportInfo(
                    module=module,
                    imported_names=[alias.name for alias in node.names],
                    alias=None,
                    is_relative=level > 0,
                    line=node.lineno,
                )
            )
    return imports


def _has_main_guard(tree: ast.Module) -> bool:
    for node in tree.body:
        if not isinstance(node, ast.If):
            continue
        test = node.test
        if not (isinstance(test, ast.Compare) and isinstance(test.left, ast.Name) and test.left.id == "__name__"):
            continue
        for comparator in test.comparators:
            if isinstance(comparator, ast.Constant) and comparator.value == "__main__":
                return True
    return False


def derive_python_module_name(relative_path: str) -> str:
    path = Path(relative_path)
    parts = list(path.parts)
    if parts and parts[-1] == "__init__.py":
        parts = parts[:-1]
    elif parts:
        parts[-1] = path.stem
    return ".".join(parts)


def analyze_python_file(relative_path: str, source: str, line_count: int) -> FileAnalysis:
    module = derive_python_module_name(relative_path)

    try:
        tree = ast.parse(source, filename=relative_path)
    except SyntaxError as exc:
        return FileAnalysis(
            path=relative_path,
            language="python",
            line_count=line_count,
            module=module,
            syntax_error=f"Line {exc.lineno}: {exc.msg}",
        )

    functions = [
        _build_function_info(node)
        for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]
    classes = [_build_class_info(node) for node in tree.body if isinstance(node, ast.ClassDef)]

    return FileAnalysis(
        path=relative_path,
        language="python",
        line_count=line_count,
        module=module,
        imports=_extract_imports(tree),
        functions=functions,
        classes=classes,
        has_main_guard=_has_main_guard(tree),
        syntax_error=None,
    )
