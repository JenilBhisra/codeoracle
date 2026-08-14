import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.models.job import JobStatus
from app.services import job_service
from tests.helpers import make_zip


def test_create_job_returns_unique_ids_with_queued_status():
    job_id_1 = job_service.create_job()
    job_id_2 = job_service.create_job()

    assert job_id_1 != job_id_2
    record = job_service.get_job(job_id_1)
    assert record.status == JobStatus.QUEUED
    assert record.progress == 0
    assert record.error is None


def test_get_job_returns_none_for_unknown_id():
    assert job_service.get_job("does-not-exist") is None


def test_run_job_pipeline_completes_successfully(tmp_path, job_dirs):
    zip_path = make_zip(
        tmp_path / "src.zip",
        {"proj/app.py": "import os\ndef hello():\n    return os.getcwd()\n"},
    )

    job_id = job_service.create_job()
    job_service.run_job_pipeline(job_id, job_service.obtain_uploaded_zip(zip_path), project_name="demo")

    record = job_service.get_job(job_id)
    assert record.status == JobStatus.COMPLETED
    assert record.progress == 100
    assert record.error is None
    assert record.results_path is not None


def test_run_job_pipeline_writes_results_matching_contract_shape(tmp_path, job_dirs):
    zip_path = make_zip(
        tmp_path / "src.zip",
        {
            "proj/app.py": "import os\n",
            "proj/util.js": "export function add(a, b) { return a + b; }\n",
        },
    )

    job_id = job_service.create_job()
    job_service.run_job_pipeline(job_id, job_service.obtain_uploaded_zip(zip_path), project_name="mixed-project")

    record = job_service.get_job(job_id)
    results = json.loads(Path(record.results_path).read_text())

    assert results["job_id"] == job_id
    assert results["status"] == "completed"
    assert results["summary"]["project_name"] == "mixed-project"
    assert set(results["summary"]["languages"]) == {"python", "javascript"}
    assert results["summary"]["file_count"] == 2
    assert "nodes" in results["dependency_graph"]
    assert "edges" in results["dependency_graph"]
    # No GEMINI_API_KEY in the test environment, so narrative generation
    # gracefully skips - but static facts (file_tree, signatures, imports)
    # still populate the modules, just with empty purpose/explanation text.
    assert len(results["explanation"]["modules"]) == 2
    assert all(m["purpose"] == "" for m in results["explanation"]["modules"])
    assert "not configured" in results["explanation"]["warnings"][0].lower()
    assert results["generated_tests"]["files"] == []
    assert results["refactored_files"] == []


def test_run_job_pipeline_cleans_up_upload_dir_after_success(tmp_path, job_dirs):
    uploads_dir, _ = job_dirs
    zip_path = make_zip(tmp_path / "src.zip", {"app.py": "print(1)\n"})

    job_id = job_service.create_job()
    job_service.run_job_pipeline(job_id, job_service.obtain_uploaded_zip(zip_path))

    assert not (uploads_dir / job_id).exists()


def test_run_job_pipeline_marks_failed_on_invalid_zip_with_sanitized_message(tmp_path, job_dirs):
    fake_zip = tmp_path / "not_a_zip.zip"
    fake_zip.write_text("definitely not a zip")

    job_id = job_service.create_job()
    job_service.run_job_pipeline(job_id, job_service.obtain_uploaded_zip(fake_zip))

    record = job_service.get_job(job_id)
    assert record.status == JobStatus.FAILED
    assert record.progress == 100
    assert record.error is not None
    assert "not a valid ZIP" in record.error


def test_run_job_pipeline_marks_failed_with_generic_message_on_unexpected_error(job_dirs):
    def broken_obtain(dest: Path) -> None:
        raise ValueError("sensitive internal detail that must not leak")

    job_id = job_service.create_job()
    job_service.run_job_pipeline(job_id, broken_obtain)

    record = job_service.get_job(job_id)
    assert record.status == JobStatus.FAILED
    assert "sensitive internal detail" not in record.error
    assert record.error == "An unexpected error occurred while processing this job."


def test_run_job_pipeline_cleans_up_upload_dir_even_on_failure(tmp_path, job_dirs):
    uploads_dir, _ = job_dirs
    fake_zip = tmp_path / "not_a_zip.zip"
    fake_zip.write_text("definitely not a zip")

    job_id = job_service.create_job()
    job_service.run_job_pipeline(job_id, job_service.obtain_uploaded_zip(fake_zip))

    assert not (uploads_dir / job_id).exists()


def test_cleanup_expired_jobs_removes_old_jobs_and_their_dirs(tmp_path, job_dirs):
    generated_dir_root = job_dirs[1]
    zip_path = make_zip(tmp_path / "src.zip", {"app.py": "print(1)\n"})

    job_id = job_service.create_job()
    job_service.run_job_pipeline(job_id, job_service.obtain_uploaded_zip(zip_path))

    record = job_service.get_job(job_id)
    record.updated_at = datetime.now(timezone.utc) - timedelta(minutes=120)

    removed = job_service.cleanup_expired_jobs(ttl_minutes=60)

    assert job_id in removed
    assert job_service.get_job(job_id) is None
    assert not (generated_dir_root / job_id).exists()


def test_cleanup_expired_jobs_keeps_recent_jobs(job_dirs):
    job_id = job_service.create_job()

    removed = job_service.cleanup_expired_jobs(ttl_minutes=60)

    assert job_id not in removed
    assert job_service.get_job(job_id) is not None
