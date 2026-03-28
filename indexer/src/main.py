"""FastAPI app — registra routers e injeta dependências."""
from __future__ import annotations

import logging
import os
from typing import Annotated

logging.basicConfig(level=logging.INFO)

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database import Database
from src.routes import catalog as catalog_router
from src.routes import indexing as indexing_router


def create_app(db_path: str | None = None) -> FastAPI:
    """Factory usada também nos testes (permite injetar db_path)."""
    resolved_db = db_path or os.environ.get("DATABASE_PATH", "/data/db/catalog.db")

    app = FastAPI(title="RPG Catalog API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Instância compartilhada do DB — inicializa schema na subida
    _db = Database(resolved_db)
    _db.init_schema()
    _db.migrate_schema()

    def get_db() -> Database:
        return _db

    # Substitui o placeholder nas routes
    catalog_router.router.dependencies.clear()
    catalog_router._get_db = get_db  # type: ignore[attr-defined]

    # Override de dependência via FastAPI
    app.include_router(catalog_router.router)
    app.include_router(indexing_router.router)

    # Injeta DB via dependency override
    from src.routes.catalog import _get_db as catalog_dep
    app.dependency_overrides[catalog_dep] = get_db

    return app


# Instância para uvicorn
app = create_app()
