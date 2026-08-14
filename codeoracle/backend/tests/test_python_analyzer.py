from app.services.python_analyzer import analyze_python_file, derive_python_module_name


def test_derive_python_module_name_regular_file():
    assert derive_python_module_name("app/services/main.py") == "app.services.main"


def test_derive_python_module_name_init_file():
    assert derive_python_module_name("app/services/__init__.py") == "app.services"


def test_analyze_python_file_extracts_imports():
    source = (
        "import os\n"
        "import numpy as np\n"
        "from typing import Optional\n"
        "from . import helpers\n"
        "from .utils import thing as t\n"
    )

    result = analyze_python_file("app/main.py", source, line_count=5)

    assert result.syntax_error is None
    assert result.imports[0].module == "os"
    assert result.imports[1].module == "numpy"
    assert result.imports[1].alias == "np"
    assert result.imports[2].module == "typing"
    assert result.imports[2].imported_names == ["Optional"]
    assert result.imports[3].module == "."
    assert result.imports[3].is_relative is True
    assert result.imports[4].module == ".utils"
    assert result.imports[4].imported_names == ["thing"]


def test_analyze_python_file_extracts_function_details():
    source = (
        "def greet(name: str, greeting: str = 'hi') -> str:\n"
        "    \"\"\"Greet someone.\"\"\"\n"
        "    return f'{greeting}, {name}'\n"
    )

    result = analyze_python_file("app/greet.py", source, line_count=3)

    func = result.functions[0]
    assert func.name == "greet"
    assert func.docstring == "Greet someone."
    assert func.return_annotation == "str"
    assert func.parameters[0].name == "name"
    assert func.parameters[0].annotation == "str"
    assert func.parameters[1].default == "'hi'"


def test_analyze_python_file_extracts_async_and_varargs():
    source = "async def handler(*args, **kwargs):\n    pass\n"

    result = analyze_python_file("app/handler.py", source, line_count=2)

    func = result.functions[0]
    assert func.is_async is True
    assert func.parameters[0].name == "*args"
    assert func.parameters[1].name == "**kwargs"


def test_analyze_python_file_extracts_class_with_decorated_method():
    source = (
        "class Widget:\n"
        "    \"\"\"A widget.\"\"\"\n\n"
        "    @staticmethod\n"
        "    def make():\n"
        "        return Widget()\n"
    )

    result = analyze_python_file("app/widget.py", source, line_count=6)

    cls = result.classes[0]
    assert cls.name == "Widget"
    assert cls.docstring == "A widget."
    assert cls.methods[0].name == "make"
    assert cls.methods[0].decorators == ["staticmethod"]
    assert cls.methods[0].calls == ["Widget"]


def test_analyze_python_file_extracts_class_bases():
    source = "class Base:\n    pass\n\nclass Child(Base):\n    pass\n"

    result = analyze_python_file("app/models.py", source, line_count=5)

    assert result.classes[1].bases == ["Base"]


def test_analyze_python_file_detects_main_guard():
    source = "def main():\n    pass\n\nif __name__ == '__main__':\n    main()\n"

    result = analyze_python_file("app/run.py", source, line_count=5)

    assert result.has_main_guard is True


def test_analyze_python_file_without_main_guard():
    source = "def helper():\n    pass\n"

    result = analyze_python_file("app/helper.py", source, line_count=2)

    assert result.has_main_guard is False


def test_analyze_python_file_records_syntax_error_without_raising():
    source = "def broken(:\n    pass\n"

    result = analyze_python_file("app/broken.py", source, line_count=2)

    assert result.syntax_error is not None
    assert result.functions == []
    assert result.classes == []
