"""Endpoints de indexação: POST /api/index, GET /api/index/status, GET /api/health."""
from __future__ import annotations

import os
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


# ── Enrichment state ─────────────────────────────────────────────────────────

_enrich_state: dict[str, Any] = {
    "status": "idle",
    "current_job": None,
    "progress": {},
    "last_run": None,
    "errors_log": [],
}
_enrich_lock = threading.Lock()


def get_enrichment_state() -> dict:
    with _enrich_lock:
        return dict(_enrich_state)


def _set_enrich_state(**kwargs) -> None:
    with _enrich_lock:
        _enrich_state.update(kwargs)


def run_enrichment_job(job_id: str, db_path: str, config_path: str, file_hashes: list[str], retry_failed: bool = False) -> None:
    """Runs LLM enrichment on unenriched books (or specific hashes) in background."""
    _set_enrich_state(status="enriching", current_job=job_id, progress={
        "phase": "loading", "total": 0, "processed": 0, "errors": 0, "current_file": None,
    }, errors_log=[])

    try:
        from src.config import load_config
        from src.database import Database
        import os

        cfg = load_config(config_path)
        db = Database(db_path)

        if not cfg.llm.enabled or not cfg.llm.providers:
            _set_enrich_state(status="error", current_job=None,
                              errors_log=[{"error": "LLM not configured"}])
            return

        from src.enrichment import EnrichmentService
        from src.llm.router import LLMRouter
        from src.llm.anthropic import AnthropicProvider
        from src.llm.openrouter import OpenRouterProvider
        from src.llm.google import GoogleProvider
        from src.pdf_extractor import extract_text_sample

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
        service = EnrichmentService(router=router, taxonomy=taxonomy)

        # Select target books
        if file_hashes:
            books = [db.get_book(h) for h in file_hashes if db.get_book(h)]
        elif retry_failed:
            books, _ = db.list_books(page=1, per_page=100_000, has_llm_error=True)
        else:
            # All books without llm_provider (not yet enriched)
            all_books, _ = db.list_books(page=1, per_page=100_000)
            books = [b for b in all_books if not b.llm_provider]

        total = len(books)
        with _enrich_lock:
            _enrich_state["progress"]["total"] = total

        import asyncio
        error_log = []

        for idx, book in enumerate(books):
            with _enrich_lock:
                _enrich_state["progress"].update({
                    "phase": "enriching",
                    "processed": idx,
                    "current_file": book.filename,
                })
            try:
                text = extract_text_sample(book.file_path, max_pages=5)
                result = asyncio.run(service.enrich(text=text, language=book.language))
                db.update_book_metadata(
                    book.file_hash,
                    system_tags=result.system_tags or book.system_tags,
                    category_tags=result.category_tags or book.category_tags,
                    genre_tags=result.genre_tags or book.genre_tags,
                    custom_tags=result.custom_tags or book.custom_tags,
                    summary=result.summary or book.summary,
                )
                # Update llm fields directly
                from datetime import datetime, timezone
                with db._connect() as conn:
                    conn.execute(
                        "UPDATE books SET llm_provider=?, llm_confidence=?, updated_at=? WHERE file_hash=?",
                        (result.llm_provider, result.confidence,
                         datetime.now(timezone.utc).isoformat(), book.file_hash),
                    )
                db.clear_llm_error(book.file_hash)
            except Exception as exc:
                db.set_llm_error(book.file_hash, str(exc))
                error_log.append({"file": book.filename, "error": str(exc)})
                with _enrich_lock:
                    _enrich_state["progress"]["errors"] = len(error_log)

        last_run = {
            "job_id": job_id,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed",
            "total": total,
            "errors": len(error_log),
        }
        _set_enrich_state(status="idle", current_job=None, progress={},
                          last_run=last_run, errors_log=error_log)
    except Exception as exc:
        _set_enrich_state(status="error", current_job=None, errors_log=[{"error": str(exc)}])


class EnrichRequest(BaseModel):
    file_hashes: list[str] = []
    retry_failed: bool = False
    dry_run: bool = False


@router.post("/enrich", status_code=202)
def start_enrich(
    background_tasks: BackgroundTasks,
    request: EnrichRequest = Body(default_factory=EnrichRequest),
):
    state = get_enrichment_state()
    if state["status"] == "enriching":
        return JSONResponse(status_code=409, content={
            "status": "busy",
            "current_job": state["current_job"],
            "progress": state["progress"],
        })

    job_id = f"enr-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    _set_enrich_state(status="enriching", current_job=job_id)

    if not request.dry_run:
        db_path = os.environ.get("DATABASE_PATH", "/data/db/catalog.db")
        config_path = os.environ.get("CONFIG_PATH", "config.yaml")
        background_tasks.add_task(
            run_enrichment_job, job_id, db_path, config_path,
            request.file_hashes, request.retry_failed,
        )

    return {"job_id": job_id, "status": "started", "message": "Enrichment started"}


@router.get("/enrich/status")
def enrich_status():
    return get_enrichment_state()


@router.get("/enrich/failed-count")
def enrich_failed_count():
    """Returns count of books with llm_error for retry indicator."""
    from src.database import Database
    db_path = os.environ.get("DATABASE_PATH", "/data/db/catalog.db")
    db = Database(db_path)
    _, count = db.list_books(page=1, per_page=1, has_llm_error=True)
    return {"count": count}


BACKEND_VERSION = os.environ.get("APP_VERSION", "dev")


@router.get("/health")
def health():
    return {"status": "ok", "version": BACKEND_VERSION}


@router.get("/version")
def get_version():
    return {"version": BACKEND_VERSION}
