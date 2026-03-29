"""Testes para routes/indexing.py — POST /api/index e GET /api/index/status."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from src.main import create_app


@pytest.fixture
def client(tmp_path):
    from src.database import Database
    db_path = str(tmp_path / "test.db")
    db = Database(db_path)
    db.init_schema()
    app = create_app(db_path=db_path)
    return TestClient(app)


def test_post_index_starts_job(client):
    with patch("src.routes.indexing.run_indexing_job") as mock_job:
        r = client.post("/api/index")
    assert r.status_code == 202
    data = r.json()
    assert data["status"] == "started"
    assert "job_id" in data


def test_post_index_busy_returns_409(client):
    with patch("src.routes.indexing.get_indexing_state") as mock_state:
        mock_state.return_value = {"status": "indexing", "current_job": "idx-123", "progress": {}}
        r = client.post("/api/index")
    assert r.status_code == 409
    assert r.json()["status"] == "busy"


def test_get_status_idle(client):
    r = client.get("/api/index/status")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] in ("idle", "indexing", "error")


def test_get_status_has_required_fields(client):
    r = client.get("/api/index/status")
    data = r.json()
    assert "status" in data
    assert "current_job" in data
    assert "progress" in data
    assert "last_run" in data


def test_health_endpoint(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "version" in data
