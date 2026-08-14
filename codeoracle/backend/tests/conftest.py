import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import job_service


@pytest.fixture(autouse=True)
def _reset_groq_config(monkeypatch):
    """Tests must be deterministic regardless of the developer's local .env.

    Without this, a real GROQ_API_KEY/GROQ_MODEL in backend/.env makes
    every test that doesn't explicitly mock Groq start firing real network
    calls, turning fast/deterministic "not configured" tests into slow,
    flaky ones. Tests that want Groq "on" set it explicitly in their own
    body, which overrides this baseline.
    """
    monkeypatch.setattr(settings, "groq_api_key", "")
    monkeypatch.setattr(settings, "groq_model", "")


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
