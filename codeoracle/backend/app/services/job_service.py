import json
import logging
import shutil
import threading
import uuid
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.config import GENERATED_DIR, UPLOADS_DIR, settings
from app.core.exceptions import CodeOracleError
from app.models.job import PROGRESS_BY_STATUS, JobRecord, JobStatus
from app.services.analyzer_service import analyze_codebase
from app.services.explanation_service import explain_project
from app.services.github_service import download_github_repo_zip
from app.services.graph_service import build_dependency_graph
from app.services.test_generation_service import generate_tests_for_project
from app.services.upload_service import process_zip_source
from app.utils.cleanup import cleanup_dir

logger = logging.getLogger(__name__)

_jobs: dict[str, JobRecord] = {}
_lock = threading.Lock()


def create_job() -> str:
    job_id = uuid.uuid4().hex
    with _lock:
        _jobs[job_id] = JobRecord(job_id=job_id)
    return job_id


def get_job(job_id: str) -> JobRecord | None:
    with _lock:
        return _jobs.get(job_id)


def _update_job(job_id: str, *, status: JobStatus, message: str) -> None:
    with _lock:
        record = _jobs.get(job_id)
        if record is None:
            return
        record.status = status
        record.message = message
        record.progress = PROGRESS_BY_STATUS[status]
        record.updated_at = datetime.now(timezone.utc)


def _fail_job(job_id: str, error_message: str) -> None:
    with _lock:
        record = _jobs.get(job_id)
        if record is None:
            return
        record.status = JobStatus.FAILED
        record.progress = PROGRESS_BY_STATUS[JobStatus.FAILED]
        record.message = "Analysis failed"
        record.error = error_message
        record.updated_at = datetime.now(timezone.utc)


def _job_upload_dir(job_id: str) -> Path:
    return UPLOADS_DIR / job_id


def _job_generated_dir(job_id: str) -> Path:
    return GENERATED_DIR / job_id


def obtain_uploaded_zip(source_zip_path: Path) -> Callable[[Path], None]:
    def _copy(dest: Path) -> None:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source_zip_path, dest)

    return _copy


def obtain_github_zip(repo_url: str) -> Callable[[Path], None]:
    def _download(dest: Path) -> None:
        dest.parent.mkdir(parents=True, exist_ok=True)
        download_github_repo_zip(repo_url, dest)

    return _download


def run_job_pipeline(
    job_id: str, obtain_zip: Callable[[Path], None], *, project_name: str | None = None
) -> None:
    """Run the full ingestion -> analysis -> graph pipeline for a job.

    `obtain_zip(dest_path)` must place a ZIP archive at dest_path; the caller
    decides whether that's a copy of a saved upload or a GitHub download, so
    this function stays source-agnostic. Designed to be handed to FastAPI's
    BackgroundTasks in Phase 10 - it takes no request/response objects and
    only talks to the module-level job store.
    """
    job_dir = _job_upload_dir(job_id)
    zip_path = job_dir / "source.zip"
    extract_dir = job_dir / "extracted"

    try:
        _update_job(job_id, status=JobStatus.EXTRACTING, message="Downloading and extracting project")
        obtain_zip(zip_path)

        ingest_result = process_zip_source(zip_path, extract_dir, project_name=project_name)

        _update_job(job_id, status=JobStatus.PARSING, message="Analyzing source files")
        codebase = analyze_codebase(ingest_result)
        graph = build_dependency_graph(codebase)

        _update_job(job_id, status=JobStatus.EXPLAINING, message="Generating explanations")
        explanation = explain_project(codebase, graph)

        _update_job(job_id, status=JobStatus.GENERATING_TESTS, message="Generating tests")
        generated_tests, test_warnings = generate_tests_for_project(codebase)

        # Phase 9 (Gemini-backed refactor generation) isn't implemented yet;
        # the state machine still passes through this stage so the job's
        # progress reporting is already forward-compatible with the final
        # pipeline.
        _update_job(job_id, status=JobStatus.REFACTORING, message="Generating refactor proposals")

        warnings = codebase.warnings + graph.warnings + explanation.warnings + test_warnings
        results = {
            "job_id": job_id,
            "status": JobStatus.COMPLETED.value,
            "summary": {
                "project_name": codebase.project_name,
                "languages": codebase.languages,
                "file_count": len(codebase.files),
                "line_count": codebase.line_count,
                "module_count": len(codebase.files),
                "dependency_count": len(graph.edges),
            },
            "explanation": explanation.model_dump(),
            "dependency_graph": graph.model_dump(),
            "generated_tests": [t.model_dump() for t in generated_tests],
            "refactored_files": [],
            "warnings": warnings,
        }

        generated_dir = _job_generated_dir(job_id)
        generated_dir.mkdir(parents=True, exist_ok=True)
        (generated_dir / "results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")

        with _lock:
            record = _jobs.get(job_id)
            if record is not None:
                record.results_path = str(generated_dir / "results.json")
                record.warnings = warnings

        _update_job(job_id, status=JobStatus.COMPLETED, message="Analysis completed")

    except CodeOracleError as exc:
        logger.warning("Job %s failed: %s", job_id, exc.message)
        _fail_job(job_id, exc.message)
    except Exception:
        logger.exception("Unexpected error while processing job %s", job_id)
        _fail_job(job_id, "An unexpected error occurred while processing this job.")
    finally:
        cleanup_dir(job_dir)


def cleanup_expired_jobs(*, ttl_minutes: int | None = None) -> list[str]:
    """Remove job records and their generated results once past the TTL."""
    ttl = ttl_minutes if ttl_minutes is not None else settings.job_ttl_minutes
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=ttl)

    with _lock:
        expired_ids = [job_id for job_id, record in _jobs.items() if record.updated_at < cutoff]
        for job_id in expired_ids:
            del _jobs[job_id]

    for job_id in expired_ids:
        cleanup_dir(_job_generated_dir(job_id))
        cleanup_dir(_job_upload_dir(job_id))

    return expired_ids
