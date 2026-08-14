from pydantic import BaseModel, Field


class FunctionExplanation(BaseModel):
    name: str
    summary: str
    inputs: str = ""
    outputs: str = ""
    side_effects: str = ""
    risks: str = ""


class ClassExplanation(BaseModel):
    name: str
    summary: str
    responsibilities: str = ""
    risks: str = ""


class ModuleExplanation(BaseModel):
    module: str
    path: str
    summary: str
    functions: list[FunctionExplanation] = Field(default_factory=list)
    classes: list[ClassExplanation] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    confidence: str = "medium"


class ChunkExplanationResult(BaseModel):
    """Shape Gemini must return for one map-step call covering a chunk of files."""

    modules: list[ModuleExplanation] = Field(default_factory=list)


class ProjectOverviewResult(BaseModel):
    """Shape Gemini must return for the reduce-step project summary call."""

    project_overview: str
    architecture_summary: str


class ProjectExplanation(BaseModel):
    project_overview: str = ""
    architecture_summary: str = ""
    detected_languages: list[str] = Field(default_factory=list)
    main_entry_points: list[str] = Field(default_factory=list)
    important_modules: list[str] = Field(default_factory=list)
    external_dependencies: list[str] = Field(default_factory=list)
    modules: list[ModuleExplanation] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
