from pathlib import Path

import esprima
from esprima.error_handler import Error as EsprimaError

from app.models.codebase import ClassInfo, FileAnalysis, FunctionInfo, ImportInfo, ParameterInfo

PARSE_OPTIONS = {"loc": True, "range": True, "tolerant": True}


def derive_js_module_name(relative_path: str) -> str:
    return Path(relative_path).with_suffix("").as_posix()


def _slice(source: str, node) -> str | None:
    if node is None or not hasattr(node, "range"):
        return None
    start, end = node.range
    return source[start:end]


def _walk(node):
    if node is None:
        return
    if isinstance(node, list):
        for item in node:
            yield from _walk(item)
        return
    if not hasattr(node, "type"):
        return
    yield node
    for key, value in vars(node).items():
        if key in ("loc", "range", "type"):
            continue
        if isinstance(value, list):
            for item in value:
                yield from _walk(item)
        elif hasattr(value, "type"):
            yield from _walk(value)


def _extract_calls(node) -> list[str]:
    calls: set[str] = set()
    for child in _walk(node):
        if child.type != "CallExpression":
            continue
        callee = child.callee
        if callee.type == "Identifier":
            calls.add(callee.name)
        elif callee.type == "MemberExpression" and hasattr(callee.property, "name"):
            calls.add(callee.property.name)
    return sorted(calls)


def _param_info(source: str, node) -> ParameterInfo:
    if node.type == "AssignmentPattern":
        return ParameterInfo(name=_slice(source, node.left) or "?", default=_slice(source, node.right))
    if node.type == "RestElement":
        return ParameterInfo(name=f"...{_slice(source, node.argument) or '?'}")
    return ParameterInfo(name=_slice(source, node) or "?")


def _extract_params(source: str, params) -> list[ParameterInfo]:
    return [_param_info(source, p) for p in params]


_BRANCH_NODE_TYPES = {
    "IfStatement",
    "ForStatement",
    "ForInStatement",
    "ForOfStatement",
    "WhileStatement",
    "DoWhileStatement",
    "TryStatement",
    "SwitchCase",
}


def _count_branches(node) -> int:
    return sum(1 for child in _walk(node) if child.type in _BRANCH_NODE_TYPES)


def _function_info_from_node(source: str, name: str, func_node) -> FunctionInfo:
    return FunctionInfo(
        name=name,
        parameters=_extract_params(source, func_node.params),
        return_annotation=None,
        is_async=bool(getattr(func_node, "isAsync", False)),
        decorators=[],
        docstring=None,
        calls=_extract_calls(func_node.body),
        branch_count=_count_branches(func_node.body),
        line_start=func_node.loc.start.line,
        line_end=func_node.loc.end.line,
    )


def _class_info_from_node(source: str, class_node) -> ClassInfo:
    methods = []
    for item in class_node.body.body:
        if item.type != "MethodDefinition":
            continue
        method_name = getattr(item.key, "name", None) or _slice(source, item.key) or "?"
        methods.append(_function_info_from_node(source, method_name, item.value))

    return ClassInfo(
        name=class_node.id.name if class_node.id else "(anonymous)",
        bases=[b] if (b := _slice(source, getattr(class_node, "superClass", None))) else [],
        decorators=[],
        docstring=None,
        methods=methods,
        line_start=class_node.loc.start.line,
        line_end=class_node.loc.end.line,
    )


def _import_specifier_names(specifiers) -> tuple[list[str], str | None]:
    imported_names: list[str] = []
    alias: str | None = None
    for spec in specifiers:
        if spec.type == "ImportDefaultSpecifier":
            alias = spec.local.name
        elif spec.type == "ImportNamespaceSpecifier":
            alias = spec.local.name
        elif spec.type == "ImportSpecifier":
            imported_names.append(spec.imported.name)
    return imported_names, alias


def _is_relative_module(module: str) -> bool:
    return module.startswith(".")


def _extract_esm_imports(body) -> list[ImportInfo]:
    imports: list[ImportInfo] = []
    for node in body:
        if node.type != "ImportDeclaration":
            continue
        module = node.source.value
        imported_names, alias = _import_specifier_names(node.specifiers)
        imports.append(
            ImportInfo(
                module=module,
                imported_names=imported_names,
                alias=alias,
                is_relative=_is_relative_module(module),
                line=node.loc.start.line,
            )
        )
    return imports


def _require_call_module(call_node) -> str | None:
    if call_node.type != "CallExpression":
        return None
    if call_node.callee.type != "Identifier" or call_node.callee.name != "require":
        return None
    if not call_node.arguments or call_node.arguments[0].type != "Literal":
        return None
    return call_node.arguments[0].value


def _extract_commonjs_requires(body) -> list[ImportInfo]:
    imports: list[ImportInfo] = []
    for node in body:
        if node.type == "VariableDeclaration":
            for decl in node.declarations:
                if decl.init is None:
                    continue
                module = _require_call_module(decl.init)
                if module is None:
                    continue
                alias = decl.id.name if decl.id.type == "Identifier" else None
                imports.append(
                    ImportInfo(
                        module=module,
                        imported_names=[],
                        alias=alias,
                        is_relative=_is_relative_module(module),
                        line=node.loc.start.line,
                    )
                )
        elif node.type == "ExpressionStatement":
            module = _require_call_module(node.expression)
            if module is not None:
                imports.append(
                    ImportInfo(
                        module=module,
                        imported_names=[],
                        alias=None,
                        is_relative=_is_relative_module(module),
                        line=node.loc.start.line,
                    )
                )
    return imports


def _exported_name_from_declaration(decl) -> str | None:
    if decl.type in ("FunctionDeclaration", "ClassDeclaration") and decl.id:
        return decl.id.name
    if decl.type == "VariableDeclaration" and decl.declarations:
        first_id = decl.declarations[0].id
        return getattr(first_id, "name", None)
    return None


def _extract_exports(body) -> list[str]:
    exports: list[str] = []
    for node in body:
        if node.type == "ExportDefaultDeclaration":
            exports.append("default")
        elif node.type == "ExportNamedDeclaration":
            if node.declaration is not None:
                name = _exported_name_from_declaration(node.declaration)
                if name:
                    exports.append(name)
            for spec in node.specifiers:
                exports.append(spec.exported.name)
        elif node.type == "ExpressionStatement" and node.expression.type == "AssignmentExpression":
            left = node.expression.left
            if left.type != "MemberExpression":
                continue
            obj = left.object
            prop_name = getattr(left.property, "name", None)

            if obj.type == "Identifier" and obj.name == "exports" and prop_name:
                # exports.X = ...
                exports.append(prop_name)
            elif obj.type == "Identifier" and obj.name == "module" and prop_name == "exports":
                # module.exports = ... (whole-module reassignment)
                exports.append("module.exports")
            elif (
                obj.type == "MemberExpression"
                and getattr(obj.object, "name", None) == "module"
                and getattr(obj.property, "name", None) == "exports"
                and prop_name
            ):
                # module.exports.X = ...
                exports.append(prop_name)
    return exports


def _top_level_functions_and_classes(body) -> tuple[list, list]:
    """Return (function-like decl nodes, class decl nodes), unwrapping export wrappers."""
    functions = []
    classes = []
    for node in body:
        target = node
        if node.type in ("ExportNamedDeclaration", "ExportDefaultDeclaration") and node.declaration is not None:
            target = node.declaration

        if target.type == "FunctionDeclaration":
            functions.append(("declaration", target))
        elif target.type == "ClassDeclaration":
            classes.append(target)
        elif target.type == "VariableDeclaration":
            for decl in target.declarations:
                if decl.init is not None and decl.init.type in ("ArrowFunctionExpression", "FunctionExpression"):
                    name = decl.id.name if decl.id.type == "Identifier" else "?"
                    functions.append(("variable", (name, decl.init)))
    return functions, classes


def analyze_javascript_file(relative_path: str, source: str, line_count: int) -> FileAnalysis:
    module = derive_js_module_name(relative_path)

    try:
        tree = esprima.parseModule(source, options=PARSE_OPTIONS)
    except EsprimaError as exc:
        return FileAnalysis(
            path=relative_path,
            language="javascript",
            line_count=line_count,
            module=module,
            syntax_error=str(exc),
        )

    body = tree.body
    function_entries, class_nodes = _top_level_functions_and_classes(body)

    functions: list[FunctionInfo] = []
    for kind, payload in function_entries:
        if kind == "declaration":
            node = payload
            functions.append(_function_info_from_node(source, node.id.name if node.id else "?", node))
        else:
            name, func_node = payload
            functions.append(_function_info_from_node(source, name, func_node))

    classes = [_class_info_from_node(source, node) for node in class_nodes]

    imports = _extract_esm_imports(body) + _extract_commonjs_requires(body)
    exports = _extract_exports(body)

    return FileAnalysis(
        path=relative_path,
        language="javascript",
        line_count=line_count,
        module=module,
        imports=imports,
        functions=functions,
        classes=classes,
        exports=exports,
        has_main_guard=False,
        syntax_error=None,
    )
