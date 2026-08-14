import io
import json
import zipfile

from app.models.job import JobStatus
from app.services.job_service import create_job, get_job


def _make_zip_bytes(entries: dict[str, str]) -> io.BytesIO:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for arcname, content in entries.items():
            zf.writestr(arcname, content)
    buf.seek(0)
    return buf


def _completed_job(api_client) -> str:
    file_bytes = _make_zip_bytes({"proj/app.py": "def f():\n    pass\n"})
    response = api_client.post("/api/analyze/upload", files={"file": ("proj.zip", file_bytes, "application/zip")})
    return response.json()["job_id"]


def test_get_job_status_returns_404_for_unknown_job(api_client):
    response = api_client.get("/api/jobs/does-not-exist")

    assert response.status_code == 404
    assert "detail" in response.json()


def test_get_job_status_returns_current_state(api_client):
    job_id = _completed_job(api_client)

    response = api_client.get(f"/api/jobs/{job_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["job_id"] == job_id
    assert body["status"] == "completed"
    assert body["progress"] == 100


def test_get_job_results_returns_404_for_unknown_job(api_client):
    response = api_client.get("/api/jobs/does-not-exist/results")

    assert response.status_code == 404


def test_get_job_results_returns_202_when_not_ready(api_client):
    job_id = create_job()

    response = api_client.get(f"/api/jobs/{job_id}/results")

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    assert body["summary"] is None


def test_get_job_results_returns_completed_shape(api_client):
    job_id = _completed_job(api_client)

    response = api_client.get(f"/api/jobs/{job_id}/results")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["summary"]["file_count"] == 1
    assert "nodes" in body["dependency_graph"]
    assert body["error"] is None


def test_download_returns_404_for_unknown_job(api_client):
    response = api_client.get("/api/jobs/does-not-exist/download")

    assert response.status_code == 404


def test_download_returns_400_when_job_not_completed(api_client):
    job_id = create_job()

    response = api_client.get(f"/api/jobs/{job_id}/download")

    assert response.status_code == 400


def test_download_returns_zip_with_expected_contents(api_client):
    job_id = _completed_job(api_client)

    response = api_client.get(f"/api/jobs/{job_id}/download")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert f"codeoracle-{job_id}.zip" in response.headers["content-disposition"]

    archive = zipfile.ZipFile(io.BytesIO(response.content))
    names = archive.namelist()
    assert "summary.json" in names
    assert "explanation.json" in names
    assert "dependency_graph.json" in names
    assert "warnings.json" in names
    assert "generated_tests/manifest.json" in names
    assert "refactored/manifest.json" in names


def test_get_job_results_returns_failed_shape_with_error(api_client):
    response = api_client.post("/api/analyze/github", json={"repo_url": "https://gitlab.com/octocat/hello-world"})
    job_id = response.json()["job_id"]

    results = api_client.get(f"/api/jobs/{job_id}/results")

    assert results.status_code == 200
    body = results.json()
    assert body["status"] == "failed"
    assert body["error"] is not None
    assert body["summary"] is None


def _make_completed_job_with_results(job_dirs, results: dict) -> str:
    generated_dir_root = job_dirs[1]
    job_id = create_job()
    job_dir = generated_dir_root / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    results_path = job_dir / "results.json"
    results_path.write_text(json.dumps(results), encoding="utf-8")

    record = get_job(job_id)
    record.status = JobStatus.COMPLETED
    record.results_path = str(results_path)
    return job_id


def test_download_includes_generated_test_and_refactor_files(api_client, job_dirs):
    results = {
        "job_id": "irrelevant",
        "status": "completed",
        "summary": {
            "project_name": "demo",
            "languages": ["python"],
            "file_count": 1,
            "line_count": 2,
            "module_count": 1,
            "dependency_count": 0,
        },
        "explanation": {},
        "dependency_graph": {"nodes": [], "edges": []},
        "generated_tests": [
            {
                "target_file": "app/mod.py",
                "filename": "test_mod.py",
                "code": "def test_f():\n    assert True\n",
                "covered_functions": ["f"],
            }
        ],
        "refactored_files": [
            {
                "original_file": "app/mod.py",
                "refactored_code": "def f() -> None:\n    pass\n",
                "reason": "add types",
                "risk_level": "low",
            }
        ],
        "warnings": [],
    }
    job_id = _make_completed_job_with_results(job_dirs, results)

    response = api_client.get(f"/api/jobs/{job_id}/download")

    assert response.status_code == 200
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    names = archive.namelist()
    assert "generated_tests/00_test_mod.py" in names
    assert "refactored/app__mod.py" in names
    assert archive.read("generated_tests/00_test_mod.py").decode() == "def test_f():\n    assert True\n"
    assert archive.read("refactored/app__mod.py").decode() == "def f() -> None:\n    pass\n"
