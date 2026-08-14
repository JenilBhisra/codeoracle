import io
import json
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse

from app.models.api import JobResultsResponse, JobStatusResponse
from app.models.job import JobStatus
from app.services.job_service import get_job

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

_NOT_READY_STATUSES = {
    JobStatus.QUEUED,
    JobStatus.EXTRACTING,
    JobStatus.PARSING,
    JobStatus.EXPLAINING,
    JobStatus.GENERATING_TESTS,
    JobStatus.REFACTORING,
}


@router.get("/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str) -> JobStatusResponse:
    record = get_job(job_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Job not found or has expired.")

    return JobStatusResponse(
        job_id=record.job_id,
        status=record.status.value,
        progress=record.progress,
        message=record.message,
        error=record.error,
    )


@router.get("/{job_id}/results", response_model=JobResultsResponse)
def get_job_results(job_id: str, response: Response) -> JobResultsResponse:
    record = get_job(job_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Job not found or has expired.")

    if record.status in _NOT_READY_STATUSES:
        response.status_code = 202
        return JobResultsResponse(job_id=record.job_id, status=record.status.value)

    if record.status == JobStatus.FAILED:
        return JobResultsResponse(job_id=record.job_id, status=record.status.value, error=record.error)

    if not record.results_path:
        raise HTTPException(status_code=500, detail="Job completed but its results are missing.")

    data = json.loads(Path(record.results_path).read_text(encoding="utf-8"))
    return JobResultsResponse(**data)


@router.get("/{job_id}/download")
def download_job_results(job_id: str) -> StreamingResponse:
    record = get_job(job_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Job not found or has expired.")

    if record.status != JobStatus.COMPLETED or not record.results_path:
        raise HTTPException(status_code=400, detail="Results are not ready yet.")

    data = json.loads(Path(record.results_path).read_text(encoding="utf-8"))

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("summary.json", json.dumps(data.get("summary", {}), indent=2))
        zf.writestr("explanation.json", json.dumps(data.get("explanation", {}), indent=2))
        zf.writestr("dependency_graph.json", json.dumps(data.get("dependency_graph", {}), indent=2))
        zf.writestr("warnings.json", json.dumps(data.get("warnings", []), indent=2))

        generated_tests = data.get("generated_tests", {})
        test_files = generated_tests.get("files", [])
        test_manifest = []
        for index, test_file in enumerate(test_files):
            filename = test_file.get("filename") or f"test_{index}"
            zf.writestr(f"generated_tests/{index:02d}_{filename}", test_file.get("code", ""))
            test_manifest.append({k: v for k, v in test_file.items() if k != "code"})
        zf.writestr(
            "generated_tests/summary.json",
            json.dumps({k: v for k, v in generated_tests.items() if k != "files"}, indent=2),
        )
        zf.writestr("generated_tests/manifest.json", json.dumps(test_manifest, indent=2))

        refactor_manifest = []
        for proposal in data.get("refactored_files", []):
            path = proposal.get("path", "file")
            safe_name = path.replace("/", "__")
            zf.writestr(f"refactored/{safe_name}", proposal.get("refactored_code", ""))
            if proposal.get("original_code"):
                zf.writestr(f"refactored/original/{safe_name}", proposal["original_code"])
            refactor_manifest.append(
                {k: v for k, v in proposal.items() if k not in ("refactored_code", "original_code")}
            )
        zf.writestr("refactored/manifest.json", json.dumps(refactor_manifest, indent=2))

    buffer.seek(0)
    filename = f"codeoracle-{job_id}.zip"
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
