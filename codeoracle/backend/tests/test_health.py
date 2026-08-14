from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check_returns_healthy():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root_returns_running_status():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"name": "CodeOracle API", "status": "running"}
