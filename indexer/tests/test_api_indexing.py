"""Testes para routes/indexing.py — POST /api/index e GET /api/index/status."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from src.main import create_app


@pytest.fixture(autouse=True)
def reset_module_state():
    """Reset global state singletons before each test."""
    import src.routes.indexing as m
    m._state.update({"status": "idle", "current_job": None, "progress": {}, "last_run": None, "errors_log": []})
    m._enrich_state.update({"status": "idle", "current_job": None, "progress": {}, "last_run": None, "errors_log": []})
    yield


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


# ── POST /api/enrich ──────────────────────────────────────────────────────────

def test_post_enrich_starts_job(client):
    with patch("src.routes.indexing.run_enrichment_job") as mock_job:
        r = client.post("/api/enrich")
    assert r.status_code == 202
    data = r.json()
    assert data["status"] == "started"
    assert "job_id" in data


def test_post_enrich_dry_run_does_not_start_background_task(client):
    with patch("src.routes.indexing.run_enrichment_job") as mock_job:
        r = client.post("/api/enrich", json={"dry_run": True})
    assert r.status_code == 202
    mock_job.assert_not_called()


def test_post_enrich_busy_returns_409(client):
    with patch("src.routes.indexing.get_enrichment_state") as mock_state:
        mock_state.return_value = {"status": "enriching", "current_job": "enr-123", "progress": {}}
        r = client.post("/api/enrich")
    assert r.status_code == 409
    assert r.json()["status"] == "busy"


def test_get_enrich_status_idle(client):
    r = client.get("/api/enrich/status")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] in ("idle", "enriching", "error")
    assert "current_job" in data
    assert "progress" in data


def test_post_enrich_with_file_hashes(client):
    with patch("src.routes.indexing.run_enrichment_job") as mock_job:
        r = client.post("/api/enrich", json={"file_hashes": ["abc123", "def456"]})
    assert r.status_code == 202
    # Background task called with the hashes
    call_args = mock_job.call_args
    assert "abc123" in call_args.args or "abc123" in str(call_args)
