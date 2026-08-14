from pydantic import BaseModel, Field


class ImportInfo(BaseModel):
    module: str
    imported_names: list[str] = Field(default_factory=list)
    alias: str | None = None
    is_relative: bool = False
    line: int


class ParameterInfo(BaseModel):
    name: str
    annotation: str | None = None
    default: str | None = None


class FunctionInfo(BaseModel):
    name: str
    parameters: list[ParameterInfo] = Field(default_factory=list)
    return_annotation: str | None = None
    is_async: bool = False
    decorators: list[str] = Field(default_factory=list)
    docstring: str | None = None
    calls: list[str] = Field(default_factory=list)
    branch_count: int = 0
    line_start: int
    line_end: int | None = None


class ClassInfo(BaseModel):
    name: str
    bases: list[str] = Field(default_factory=list)
    decorators: list[str] = Field(default_factory=list)
    docstring: str | None = None
    methods: list[FunctionInfo] = Field(default_factory=list)
    line_start: int
    line_end: int | None = None


class FileAnalysis(BaseModel):
    path: str
    language: str
    line_count: int
    module: str
    imports: list[ImportInfo] = Field(default_factory=list)
    functions: list[FunctionInfo] = Field(default_factory=list)
    classes: list[ClassInfo] = Field(default_factory=list)
    exports: list[str] = Field(default_factory=list)
    has_main_guard: bool = False
    syntax_error: str | None = None


class CodebaseAnalysis(BaseModel):
    project_name: str
    languages: list[str] = Field(default_factory=list)
    line_count: int = 0
    files: list[FileAnalysis] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
