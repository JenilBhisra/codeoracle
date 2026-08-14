from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from app.core.config import settings
from app.core.exceptions import InvalidGithubUrlError
from app.models.api import GithubAnalyzeRequest, JobQueuedResponse
from app.services.github_service import parse_github_repo_url
from app.services.job_service import (
    cleanup_expired_jobs,
    create_job,
    job_upload_dir,
    obtain_github_zip,
    obtain_uploaded_zip,
    run_job_pipeline,
)

router = APIRouter(prefix="/api/analyze", tags=["analyze"])

CHUNK_SIZE = 1024 * 1024


async def _save_upload_with_limit(file: UploadFile, dest_path: Path, *, max_bytes: int) -> None:
    total_written = 0
    with open(dest_path, "wb") as out_file:
        while chunk := await file.read(CHUNK_SIZE):
            total_written += len(chunk)
            if total_written > max_bytes:
                break
            out_file.write(chunk)

    if total_written > max_bytes:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=413,
            detail=f"Uploaded file exceeds the {settings.max_upload_mb}MB limit.",
        )


@router.post("/upload", response_model=JobQueuedResponse)
async def analyze_upload(background_tasks: BackgroundTasks, file: UploadFile = File(...)) -> JobQueuedResponse:
    cleanup_expired_jobs()

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file was uploaded.")

    job_id = create_job()
    upload_dir = job_upload_dir(job_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    raw_upload_path = upload_dir / "raw_upload.zip"

    try:
        max_bytes = settings.max_upload_mb * 1024 * 1024
        await _save_upload_with_limit(file, raw_upload_path, max_bytes=max_bytes)
    finally:
        await file.close()

    project_name = Path(file.filename).stem

    background_tasks.add_task(
        run_job_pipeline, job_id, obtain_uploaded_zip(raw_upload_path), project_name=project_name
    )

    return JobQueuedResponse(job_id=job_id, status="queued", progress=0, message="Analysis queued", error=None)


@router.post("/github", response_model=JobQueuedResponse)
async def analyze_github(background_tasks: BackgroundTasks, payload: GithubAnalyzeRequest) -> JobQueuedResponse:
    cleanup_expired_jobs()

    job_id = create_job()

    try:
        owner, repo = parse_github_repo_url(payload.repo_url)
        project_name = f"{owner}/{repo}"
    except InvalidGithubUrlError:
        project_name = None

    background_tasks.add_task(
        run_job_pipeline, job_id, obtain_github_zip(payload.repo_url), project_name=project_name
    )

    return JobQueuedResponse(job_id=job_id, status="queued", progress=0, message="Analysis queued", error=None)
