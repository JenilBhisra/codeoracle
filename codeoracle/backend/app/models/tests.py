from pydantic import BaseModel, Field


class GeneratedTestResponse(BaseModel):
    """Shape Gemini must return for one file's generated test suite."""

    filename: str
    code: str
    covered_functions: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


class GeneratedTestFile(BaseModel):
    target_file: str
    language: str
    test_framework: str
    filename: str
    code: str
    covered_functions: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    coverage_label: str = "estimated"  # "measured" | "estimated" | "not_executed"
    estimated_coverage_percent: float | None = None
