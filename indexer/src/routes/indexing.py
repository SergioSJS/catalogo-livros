"""Endpoints de indexação: POST /api/index, GET /api/index/status, GET /api/health."""
from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Body, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api")

# ── Estado global em memória ──────────────────────────────────────────────────
# (singleton por processo — reiniciado com o container)

_state: dict[str, Any] = {
    "status": "idle",           # idle | indexing | error
    "current_job": None,
    "progress": {},
    "last_run": None,
    "errors_log": [],
}
_lock = threading.Lock()


def get_indexing_state() -> dict:
    with _lock:
        return dict(_state)


def _set_state(**kwargs) -> None:
    with _lock:
        _state.update(kwargs)


# ── Background job stub (substituído por indexing.py na Fase 1) ───────────────

def run_indexing_job(job_id: str, db_path: str, config_path: str, force: bool, folders: list[str]) -> None:
    """Executa o pipeline de indexação em background thread."""
    _set_state(status="indexing", current_job=job_id, progress={
        "phase": "scanning", "total_files": 0, "processed": 0,
        "new_files": 0, "skipped": 0, "errors": 0,
        "current_file": None, "elapsed_seconds": 0,
    }, errors_log=[])

    try:
        from src.indexing import IndexingPipeline
        from src.config import load_config
        from src.database import Database
        import os

        cfg = load_config(config_path)
        if force:
            cfg.indexing.min_file_size = 0
        if folders:
            cfg.sources = [s for s in cfg.sources if s.path in folders]

        db = Database(db_path)
        if force:
            db.clear_scan_log()  # força reprocessamento de todos os arquivos

        # ── Constrói EnrichmentService se LLM habilitado ──────────────────────
        enrichment_service = None
        if cfg.llm.enabled and cfg.llm.providers:
            from src.enrichment import EnrichmentService
            from src.llm.router import LLMRouter
            from src.llm.anthropic import AnthropicProvider
            from src.llm.openrouter import OpenRouterProvider
            from src.llm.google import GoogleProvider

            _provider_classes = {
                "anthropic": AnthropicProvider,
                "openrouter": OpenRouterProvider,
                "google": GoogleProvider,
            }
            built_providers = []
            for p in cfg.llm.providers:
                cls = _provider_classes.get(p.type)
                if cls:
                    built_providers.append(cls(name=p.name, model=p.model, tasks=p.tasks, env_key=p.env_key))

            router = LLMRouter(providers=built_providers)
            taxonomy = {
                "systems": cfg.tag_taxonomy.systems,
                "categories": cfg.tag_taxonomy.categories,
                "genres": cfg.tag_taxonomy.genres,
            }
            enrichment_service = EnrichmentService(router=router, taxonomy=taxonomy)

        pipeline = IndexingPipeline(config=cfg, db=db, enrichment_service=enrichment_service)

        def progress_cb(update: dict) -> None:
            with _lock:
                _state["progress"].update(update)

        result = pipeline.run(progress_callback=progress_cb)

        last_run = {
            "job_id": job_id,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed",
            "total_indexed": result.total_files,
            "new_indexed": result.new_indexed,
            "errors": result.errors,
            "duration_seconds": result.duration_seconds,
        }
        _set_state(status="idle", current_job=None, progress={}, last_run=last_run,
                   errors_log=result.error_log)
    except Exception as exc:
        _set_state(status="error", current_job=None, errors_log=[{"error": str(exc)}])


# ── Routes ────────────────────────────────────────────────────────────────────

class IndexRequest(BaseModel):
    force_reindex: bool = False
    folders: list[str] = []
    dry_run: bool = False


@router.post("/index", status_code=202)
def start_index(
    background_tasks: BackgroundTasks,
    request: IndexRequest = Body(default_factory=IndexRequest),
):
    state = get_indexing_state()
    if state["status"] == "indexing":
        return JSONResponse(status_code=409, content={
            "status": "busy",
            "current_job": state["current_job"],
            "progress": state["progress"],
        })

    job_id = f"idx-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    _set_state(status="indexing", current_job=job_id)

    if not request.dry_run:
        import os
        db_path = os.environ.get("DATABASE_PATH", "/data/db/catalog.db")
        config_path = os.environ.get("CONFIG_PATH", "config.yaml")
        background_tasks.add_task(
            run_indexing_job, job_id, db_path, config_path,
            request.force_reindex, request.folders,
        )

    return {"job_id": job_id, "status": "started", "message": "Indexing started"}


@router.get("/index/status")
def index_status():
    return get_indexing_state()


@router.get("/health")
def health():
    return {"status": "ok"}
