"""Testes para routes/catalog.py — endpoints de catálogo."""
import pytest
from fastapi.testclient import TestClient
from src.main import create_app
from src.database import Database
from src.models import BookRecord


def make_book(suffix, language="en", system_tags=None, category_tags=None, page_count=10):
    return BookRecord(
        file_hash=f"hash_{suffix}",
        file_path=f"/data/rpg/Book{suffix}.pdf",
        relative_path=f"EN/Book{suffix}.pdf",
        filename=f"Book{suffix}.pdf",
        parent_folder=f"Game{suffix}",
        title=f"Book {suffix}",
        language=language,
        file_size=1024,
        page_count=page_count,
        system_tags=system_tags or [],
        category_tags=category_tags or [],
    )


@pytest.fixture
def seeded_client(tmp_path):
    db_path = str(tmp_path / "test.db")
    db = Database(db_path)
    db.init_schema()

    books = [
        make_book("a", "en", ["OSR"], ["Core Rulebook"], page_count=100),
        make_book("b", "en", ["PbtA"], ["Supplement"], page_count=50),
        make_book("c", "pt", ["PbtA"], ["Core Rulebook"], page_count=200),
        make_book("d", "pt", ["OSR"], ["Adventure/Module"], page_count=30),
    ]
    books[0].title = "Mausritter Rules"
    books[2].title = "Dragão Dourado"
    for b in books:
        db.upsert_book(b)
        db.sync_fts(b)

    app = create_app(db_path=db_path)
    return TestClient(app)


def test_list_books_default_pagination(seeded_client):
    r = seeded_client.get("/api/books")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "pagination" in data
    assert data["pagination"]["total_items"] == 4


def test_list_books_filter_language(seeded_client):
    r = seeded_client.get("/api/books?language=pt")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 2
    assert all(b["language"] == "pt" for b in items)


def test_list_books_filter_multiple_systems(seeded_client):
    r = seeded_client.get("/api/books?system=OSR&system=PbtA")
    assert r.status_code == 200
    assert r.json()["pagination"]["total_items"] == 4


def test_list_books_search_fts(seeded_client):
    r = seeded_client.get("/api/books?q=Mausritter")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 1
    assert any("Mausritter" in b["title"] for b in items)


def test_list_books_search_fts_no_diacritics(seeded_client):
    r = seeded_client.get("/api/books?q=dragao")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 1
    assert any("Drag" in b["title"] for b in items)


def test_list_books_sort_pages_desc(seeded_client):
    r = seeded_client.get("/api/books?sort=pages_desc")
    assert r.status_code == 200
    pages = [b["page_count"] for b in r.json()["items"]]
    assert pages == sorted(pages, reverse=True)


def test_list_books_empty_result(seeded_client):
    r = seeded_client.get("/api/books?system=GURPS")
    assert r.status_code == 200
    data = r.json()
    assert data["items"] == []
    assert data["pagination"]["total_items"] == 0


def test_get_book_found(seeded_client):
    r = seeded_client.get("/api/books/hash_a")
    assert r.status_code == 200
    data = r.json()
    assert data["file_hash"] == "hash_a"
    assert "relative_path" in data


def test_get_book_not_found(seeded_client):
    r = seeded_client.get("/api/books/nonexistent")
    assert r.status_code == 404


def test_facets_all(seeded_client):
    r = seeded_client.get("/api/facets")
    assert r.status_code == 200
    data = r.json()
    assert "languages" in data
    assert "systems" in data
    assert "categories" in data
    langs = {f["value"]: f["count"] for f in data["languages"]}
    assert langs["en"] == 2
    assert langs["pt"] == 2


def test_facets_filtered_by_language(seeded_client):
    r = seeded_client.get("/api/facets?language=en")
    assert r.status_code == 200
    data = r.json()
    systems = {f["value"]: f["count"] for f in data["systems"]}
    assert systems.get("OSR", 0) == 1


def test_stats(seeded_client):
    r = seeded_client.get("/api/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["total_books"] == 4
    assert data["by_language"]["en"] == 2


def test_health(seeded_client):
    r = seeded_client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
