from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["low", "medium", "high"]
ConfidenceLevel = Literal["low", "medium", "high"]


# --- Final response shapes (what the frontend actually consumes) ----------


class FunctionParameter(BaseModel):
    name: str
    type: str | None = None
    description: str = ""


class FunctionExplanation(BaseModel):
    name: str
    signature: str = ""
    explanation: str = ""
    parameters: list[FunctionParameter] = Field(default_factory=list)
    returns: str = ""
    side_effects: list[str] = Field(default_factory=list)
    calls: list[str] = Field(default_factory=list)
    risk: RiskLevel = "low"
    confidence: ConfidenceLevel = "medium"


class ModuleExplanation(BaseModel):
    id: str
    path: str
    language: str
    purpose: str = ""
    responsibilities: list[str] = Field(default_factory=list)
    imports: list[str] = Field(default_factory=list)
    risk: RiskLevel = "low"
    function_count: int = 0
    class_count: int = 0
    functions: list[FunctionExplanation] = Field(default_factory=list)


class FileTreeNode(BaseModel):
    name: str
    type: Literal["folder", "file"]
    language: str | None = None
    moduleId: str | None = None
    children: list["FileTreeNode"] | None = None


class ProjectExplanation(BaseModel):
    project_summary: str = ""
    architecture_overview: str = ""
    languages: list[str] = Field(default_factory=list)
    entry_points: list[str] = Field(default_factory=list)
    external_dependencies: list[str] = Field(default_factory=list)
    confidence: ConfidenceLevel = "medium"
    limitations: list[str] = Field(default_factory=list)
    file_tree: list[FileTreeNode] = Field(default_factory=list)
    modules: list[ModuleExplanation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


# --- Groq-facing schemas (narrative/judgment only) --------------------------
#
# Static facts (signatures, parameter types, import lists, call names,
# function/class counts) are never asked of Groq - they're computed
# directly from the ast/esprima analysis and merged in afterward. Groq
# only supplies the things that require understanding intent: summaries,
# descriptions, risk, and confidence.


class ParameterDescription(BaseModel):
    name: str
    description: str


class FunctionNarrative(BaseModel):
    name: str
    explanation: str
    # A list of {name, description} rather than a free-form dict[str, str]:
    # Groq's strict structured-output mode only supports fixed-shape
    # objects, not open-ended string-keyed maps.
    parameter_descriptions: list[ParameterDescription] = Field(default_factory=list)
    returns: str = ""
    side_effects: list[str] = Field(default_factory=list)
    risk: RiskLevel = "low"
    confidence: ConfidenceLevel = "medium"


class ModuleNarrative(BaseModel):
    id: str
    purpose: str
    responsibilities: list[str] = Field(default_factory=list)
    risk: RiskLevel = "low"
    confidence: ConfidenceLevel = "medium"
    functions: list[FunctionNarrative] = Field(default_factory=list)


class ChunkExplanationResult(BaseModel):
    """Shape Groq must return for one map-step call covering a chunk of files."""

    modules: list[ModuleNarrative] = Field(default_factory=list)


class ProjectOverviewResult(BaseModel):
    """Shape Groq must return for the reduce-step project summary call."""

    project_summary: str
    architecture_overview: str
    confidence: ConfidenceLevel = "medium"
    limitations: list[str] = Field(default_factory=list)
