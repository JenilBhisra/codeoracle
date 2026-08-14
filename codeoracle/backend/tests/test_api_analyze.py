import io
import zipfile

from app.core.config import settings
from app.services.job_service import get_job


def _make_zip_bytes(entries: dict[str, str]) -> io.BytesIO:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for arcname, content in entries.items():
            zf.writestr(arcname, content)
    buf.seek(0)
    return buf


def test_analyze_upload_returns_queued_job(api_client):
    file_bytes = _make_zip_bytes({"proj/app.py": "def f():\n    pass\n"})

    response = api_client.post("/api/analyze/upload", files={"file": ("proj.zip", file_bytes, "application/zip")})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "queued"
    assert body["progress"] == 0
    assert body["error"] is None
    assert body["job_id"]


def test_analyze_upload_completes_and_derives_project_name_from_filename(api_client):
    file_bytes = _make_zip_bytes({"proj/app.py": "def f():\n    pass\n"})

    response = api_client.post(
        "/api/analyze/upload", files={"file": ("my-legacy-app.zip", file_bytes, "application/zip")}
    )
    job_id = response.json()["job_id"]

    record = get_job(job_id)
    assert record.status.value == "completed"

    results = api_client.get(f"/api/jobs/{job_id}/results").json()
    assert results["summary"]["project_name"] == "my-legacy-app"


def test_analyze_upload_rejects_missing_file(api_client):
    response = api_client.post("/api/analyze/upload")

    assert response.status_code == 422


def test_analyze_upload_rejects_oversized_file(api_client, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    big_bytes = io.BytesIO(b"0" * (2 * 1024 * 1024))

    response = api_client.post("/api/analyze/upload", files={"file": ("big.zip", big_bytes, "application/zip")})

    assert response.status_code == 413
    assert "1MB" in response.json()["detail"]


def test_analyze_github_returns_queued_job(api_client):
    response = api_client.post("/api/analyze/github", json={"repo_url": "https://github.com/octocat/hello-world"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "queued"
    assert body["job_id"]


def test_analyze_github_rejects_empty_repo_url(api_client):
    response = api_client.post("/api/analyze/github", json={"repo_url": ""})

    assert response.status_code == 422


def test_analyze_github_job_fails_gracefully_on_invalid_host(api_client):
    response = api_client.post("/api/analyze/github", json={"repo_url": "https://gitlab.com/octocat/hello-world"})
    job_id = response.json()["job_id"]

    status = api_client.get(f"/api/jobs/{job_id}").json()

    assert status["status"] == "failed"
    assert "GitHub" in status["error"]
