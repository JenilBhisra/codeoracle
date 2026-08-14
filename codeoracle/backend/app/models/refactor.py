from typing import Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["low", "medium", "high"]


class RefactorProposalResponse(BaseModel):
    """Shape Gemini must return for one file's refactor proposal."""

    refactored_code: str
    reason: str
    expected_benefit: str
    risk_level: RiskLevel
    breaking_changes: list[str] = Field(default_factory=list)
    migration_notes: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


class RefactorProposal(BaseModel):
    original_file: str
    language: str
    refactored_code: str
    reason: str
    expected_benefit: str
    risk_level: RiskLevel
    breaking_changes: list[str] = Field(default_factory=list)
    migration_notes: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    human_review_required: bool = True
