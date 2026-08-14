from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class JobStatus(str, Enum):
    QUEUED = "queued"
    EXTRACTING = "extracting"
    PARSING = "parsing"
    EXPLAINING = "explaining"
    GENERATING_TESTS = "generating_tests"
    REFACTORING = "refactoring"
    COMPLETED = "completed"
    FAILED = "failed"


PROGRESS_BY_STATUS: dict[JobStatus, int] = {
    JobStatus.QUEUED: 0,
    JobStatus.EXTRACTING: 15,
    JobStatus.PARSING: 40,
    JobStatus.EXPLAINING: 60,
    JobStatus.GENERATING_TESTS: 75,
    JobStatus.REFACTORING: 90,
    JobStatus.COMPLETED: 100,
    JobStatus.FAILED: 100,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class JobRecord:
    job_id: str
    status: JobStatus = JobStatus.QUEUED
    progress: int = 0
    message: str = "Analysis queued"
    error: str | None = None
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    results_path: str | None = None
    warnings: list[str] = field(default_factory=list)
