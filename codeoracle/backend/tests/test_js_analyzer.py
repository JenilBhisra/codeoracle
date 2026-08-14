from app.services.js_analyzer import analyze_javascript_file, derive_js_module_name


def test_derive_js_module_name():
    assert derive_js_module_name("src/utils/helpers.js") == "src/utils/helpers"
    assert derive_js_module_name("index.js") == "index"


def test_analyze_javascript_file_extracts_esm_imports():
    source = (
        'import React, { useState, useEffect as useEff } from "react";\n'
        'import * as fs from "fs";\n'
        'import "./styles.css";\n'
    )

    result = analyze_javascript_file("app/main.js", source, line_count=3)

    assert result.syntax_error is None
    react_import = result.imports[0]
    assert react_import.module == "react"
    assert react_import.alias == "React"
    assert react_import.imported_names == ["useState", "useEffect"]

    fs_import = result.imports[1]
    assert fs_import.module == "fs"
    assert fs_import.alias == "fs"

    css_import = result.imports[2]
    assert css_import.module == "./styles.css"
    assert css_import.is_relative is True


def test_analyze_javascript_file_extracts_commonjs_requires():
    source = 'const utils = require("./utils");\nrequire("./side-effect");\n'

    result = analyze_javascript_file("app/legacy.js", source, line_count=2)

    assert result.imports[0].module == "./utils"
    assert result.imports[0].alias == "utils"
    assert result.imports[1].module == "./side-effect"


def test_analyze_javascript_file_extracts_function_declaration():
    source = "function add(a, b = 1, ...rest) {\n  return helper(a, b);\n}\n"

    result = analyze_javascript_file("app/math.js", source, line_count=3)

    func = result.functions[0]
    assert func.name == "add"
    assert func.parameters[0].name == "a"
    assert func.parameters[1].default == "1"
    assert func.parameters[2].name == "...rest"
    assert func.calls == ["helper"]


def test_analyze_javascript_file_extracts_arrow_function_assigned_to_const():
    source = "const multiply = async (a, b) => {\n  return a * b;\n};\n"

    result = analyze_javascript_file("app/math.js", source, line_count=3)

    func = result.functions[0]
    assert func.name == "multiply"
    assert func.is_async is True


def test_analyze_javascript_file_extracts_class_with_methods():
    source = (
        "class Calculator {\n"
        "  constructor(initial) {\n"
        "    this.value = initial;\n"
        "  }\n\n"
        "  async compute(x) {\n"
        "    return this.helper(x);\n"
        "  }\n"
        "}\n"
    )

    result = analyze_javascript_file("app/calc.js", source, line_count=9)

    cls = result.classes[0]
    assert cls.name == "Calculator"
    method_names = [m.name for m in cls.methods]
    assert method_names == ["constructor", "compute"]
    compute = cls.methods[1]
    assert compute.is_async is True
    assert compute.calls == ["helper"]


def test_analyze_javascript_file_extracts_exports_esm_and_commonjs():
    source = (
        "export function add(a, b) { return a + b; }\n"
        "export default class Widget {}\n"
        "module.exports.legacyFn = function(x) { return x; };\n"
        "exports.another = 5;\n"
    )

    result = analyze_javascript_file("app/mixed.js", source, line_count=4)

    assert "add" in result.exports
    assert "default" in result.exports
    assert "legacyFn" in result.exports
    assert "another" in result.exports


def test_analyze_javascript_file_records_syntax_error_without_raising():
    source = "function broken( {\n"

    result = analyze_javascript_file("app/broken.js", source, line_count=1)

    assert result.syntax_error is not None
    assert result.functions == []
    assert result.classes == []
