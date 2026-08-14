from typing import Literal

from pydantic import BaseModel, Field

from app.models.explanation import ProjectExplanation
from app.models.graph import DependencyGraph
from app.models.refactor import RefactorProposal
from app.models.tests import CoverageInfo, GeneratedTestsResult


class JobQueuedResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    message: str
    error: str | None = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    message: str
    error: str | None = None


class GithubAnalyzeRequest(BaseModel):
    repo_url: str = Field(min_length=1)


class JobResultsSummary(BaseModel):
    project_name: str
    languages: list[str] = Field(default_factory=list)
    file_count: int
    line_count: int
    module_count: int
    dependency_count: int
    generated_test_count: int = 0
    coverage: CoverageInfo = Field(default_factory=CoverageInfo)


class WarningEntry(BaseModel):
    level: Literal["low", "medium", "high"] = "low"
    message: str
    path: str | None = None


class JobResultsResponse(BaseModel):
    job_id: str
    status: str
    summary: JobResultsSummary | None = None
    explanation: ProjectExplanation = Field(default_factory=ProjectExplanation)
    dependency_graph: DependencyGraph = Field(default_factory=DependencyGraph)
    generated_tests: GeneratedTestsResult = Field(default_factory=GeneratedTestsResult)
    refactored_files: list[RefactorProposal] = Field(default_factory=list)
    warnings: list[WarningEntry] = Field(default_factory=list)
    error: str | None = None
