"""Teste de integração: pipeline completo scan → extract → DB → FTS."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from src.indexing import IndexingPipeline
from src.database import Database
from src.config import load_config


@pytest.fixture
def pipeline(sample_tree, tmp_path, config_test_yaml):
    cfg = load_config(config_test_yaml)
    cfg.rpg_base_path = str(sample_tree)
    cfg.database_path = str(tmp_path / "catalog.db")
    cfg.thumbnails_dir = str(tmp_path / "thumbnails")
    cfg.llm.enabled = False

    db = Database(cfg.database_path)
    db.init_schema()
    return IndexingPipeline(config=cfg, db=db)


def test_pipeline_indexes_all_files(pipeline):
    result = pipeline.run()
    assert result.total_files == 4
    assert result.new_indexed == 4
    assert result.errors == 0


def test_pipeline_books_in_db(pipeline, tmp_path):
    pipeline.run()
    from src.database import Database
    db = Database(str(tmp_path / "catalog.db"))
    items, total = db.list_books(page=1, per_page=24)
    assert total == 4


def test_pipeline_skips_unchanged_files(pipeline):
    pipeline.run()
    result2 = pipeline.run()
    assert result2.new_indexed == 0
    assert result2.skipped == 4


def test_pipeline_thumbnails_created(pipeline, tmp_path):
    pipeline.run()
    thumbs = list((tmp_path / "thumbnails").glob("*.webp"))
    assert len(thumbs) == 4


def test_pipeline_fts_searchable(pipeline, tmp_path):
    pipeline.run()
    from src.database import Database
    db = Database(str(tmp_path / "catalog.db"))
    items, total = db.list_books(page=1, per_page=24, q="mausritter")
    assert total >= 1


def test_pipeline_with_enrichment(sample_tree, tmp_path, config_test_yaml):
    """Pipeline com LLM mockado popula tags e summary no DB."""
    from unittest.mock import AsyncMock, MagicMock
    from src.config import load_config
    from src.database import Database
    from src.enrichment import EnrichmentService
    from src.llm.base import TagResult

    cfg = load_config(config_test_yaml)
    cfg.rpg_base_path = str(sample_tree)
    cfg.database_path = str(tmp_path / "catalog_enriched.db")
    cfg.thumbnails_dir = str(tmp_path / "thumbnails")
    cfg.llm.enabled = True

    mock_router = MagicMock()
    mock_router.tag_book = AsyncMock(return_value=TagResult(
        system_tags=["OSR"],
        category_tags=["Core Rulebook"],
        genre_tags=["Fantasy"],
        custom_tags=["test-tag"],
        confidence=0.9,
        provider="mock-provider",
    ))
    mock_router.summarize_book = AsyncMock(return_value="A mock summary.")

    enrich_svc = EnrichmentService(router=mock_router, taxonomy={
        "systems": cfg.tag_taxonomy.systems,
        "categories": cfg.tag_taxonomy.categories,
        "genres": cfg.tag_taxonomy.genres,
    })

    db = Database(cfg.database_path)
    db.init_schema()
    p = IndexingPipeline(config=cfg, db=db, enrichment_service=enrich_svc)
    result = p.run()

    assert result.errors == 0
    items, _ = db.list_books(page=1, per_page=24)
    book = items[0]
    assert "OSR" in book.system_tags
    assert book.summary == "A mock summary."
    assert book.llm_provider == "mock-provider"
