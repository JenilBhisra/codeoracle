import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import job_service


@pytest.fixture
def job_dirs(tmp_path, monkeypatch):
    uploads = tmp_path / "uploads"
    generated = tmp_path / "generated"
    monkeypatch.setattr(job_service, "UPLOADS_DIR", uploads)
    monkeypatch.setattr(job_service, "GENERATED_DIR", generated)
    return uploads, generated


@pytest.fixture
def api_client(job_dirs):
    return TestClient(app)
