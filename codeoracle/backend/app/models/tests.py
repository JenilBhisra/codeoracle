from typing import Literal

from pydantic import BaseModel, Field

TestType = Literal["happy_path", "edge_case", "error_case", "mocked_dependency"]
CoverageLabel = Literal["measured", "estimated", "not_executed"]


class GeneratedTestFileResponse(BaseModel):
    """Shape Groq must return for one file's test suite within a batched chunk call."""

    target_file: str
    filename: str
    code: str
    covered_functions: list[str] = Field(default_factory=list)
    types: list[TestType] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


class GeneratedTestChunkResponse(BaseModel):
    """Shape Groq must return for one map-step call covering a chunk of files."""

    files: list[GeneratedTestFileResponse] = Field(default_factory=list)


class GeneratedTestFile(BaseModel):
    id: str
    filename: str
    target_file: str
    language: str
    framework: str
    covered_functions: list[str] = Field(default_factory=list)
    types: list[TestType] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    code: str


class CoverageInfo(BaseModel):
    value: float | None = None
    label: CoverageLabel = "not_executed"


class TypeBreakdown(BaseModel):
    happy_path: int = 0
    edge_case: int = 0
    error_case: int = 0
    mocked_dependency: int = 0


class GeneratedTestsResult(BaseModel):
    framework: str = ""
    coverage: CoverageInfo = Field(default_factory=CoverageInfo)
    covered_functions: int = 0
    breakdown: TypeBreakdown = Field(default_factory=TypeBreakdown)
    files: list[GeneratedTestFile] = Field(default_factory=list)
