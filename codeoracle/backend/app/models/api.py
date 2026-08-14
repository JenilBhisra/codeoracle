from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    error: str


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


class JobResultsResponse(BaseModel):
    job_id: str
    status: str
    summary: JobResultsSummary | None = None
    explanation: dict = Field(default_factory=dict)
    dependency_graph: dict = Field(default_factory=dict)
    generated_tests: list = Field(default_factory=list)
    refactored_files: list = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    error: str | None = None
