from typing import Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["low", "medium", "high"]

ImpactArea = Literal[
    "Function names",
    "Parameters",
    "Return types",
    "Exceptions",
    "Class names",
    "Module paths",
    "Imports",
    "Data formats",
    "Sync/async behavior",
    "Environment variables",
    "Configuration",
    "Side effects",
    "External API contracts",
]


class RefactorFileResponse(BaseModel):
    """Shape Groq must return for one file's refactor proposal within a batched chunk call.

    `original_code` isn't asked of Groq at all: we already have the real
    source on disk, so we attach it ourselves rather than trust a model to
    echo it back verbatim.
    """

    path: str
    refactored_code: str
    summary: str
    benefit: str
    risk: RiskLevel
    breaking_changes: list[str] = Field(default_factory=list)
    migration_notes: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    impact_areas: list[ImpactArea] = Field(default_factory=list)


class RefactorChunkResponse(BaseModel):
    """Shape Groq must return for one map-step call covering a chunk of files."""

    files: list[RefactorFileResponse] = Field(default_factory=list)


class RefactorProposal(BaseModel):
    id: str
    path: str
    language: str
    risk: RiskLevel
    summary: str
    benefit: str
    breaking_changes: list[str] = Field(default_factory=list)
    migration_notes: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    impact_areas: list[str] = Field(default_factory=list)
    requires_human_review: bool = True
    original_code: str = ""
    refactored_code: str
