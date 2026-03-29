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


# ── PATCH /api/books/{hash}/personal ─────────────────────────────────────────

def test_patch_personal_fields(seeded_client):
    r = seeded_client.patch("/api/books/hash_a/personal", json={"read_status": "read", "score": 5})
    assert r.status_code == 200
    data = r.json()
    assert data["read_status"] == "read"
    assert data["score"] == 5


def test_patch_personal_fields_partial(seeded_client):
    seeded_client.patch("/api/books/hash_a/personal", json={"score": 3})
    r = seeded_client.get("/api/books/hash_a")
    assert r.json()["score"] == 3
    assert r.json()["read_status"] == "unread"  # default mantido


def test_patch_personal_fields_not_found(seeded_client):
    r = seeded_client.patch("/api/books/nonexistent/personal", json={"score": 3})
    assert r.status_code == 404


def test_patch_personal_fields_invalid_status(seeded_client):
    r = seeded_client.patch("/api/books/hash_a/personal", json={"read_status": "bad_value"})
    assert r.status_code == 422


def test_patch_personal_fields_score_out_of_range(seeded_client):
    r = seeded_client.patch("/api/books/hash_a/personal", json={"score": 6})
    assert r.status_code == 422


def test_patch_personal_fields_all_fields(seeded_client):
    payload = {
        "read_status": "read",
        "played_status": "played",
        "solo_friendly": True,
        "review": "Excelente jogo!",
        "score": 5,
    }
    r = seeded_client.patch("/api/books/hash_a/personal", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["played_status"] == "played"
    assert data["solo_friendly"] is True
    assert data["review"] == "Excelente jogo!"


# ── Filtros pessoais ──────────────────────────────────────────────────────────

def test_filter_by_read_status(seeded_client):
    seeded_client.patch("/api/books/hash_a/personal", json={"read_status": "read"})
    r = seeded_client.get("/api/books?read_status=read")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["file_hash"] == "hash_a"


def test_filter_by_played_status(seeded_client):
    seeded_client.patch("/api/books/hash_b/personal", json={"played_status": "played"})
    r = seeded_client.get("/api/books?played_status=played")
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["file_hash"] == "hash_b"


def test_filter_by_solo_friendly(seeded_client):
    seeded_client.patch("/api/books/hash_a/personal", json={"solo_friendly": True})
    seeded_client.patch("/api/books/hash_c/personal", json={"solo_friendly": True})
    r = seeded_client.get("/api/books?solo_friendly=true")
    assert r.json()["pagination"]["total_items"] == 2


def test_filter_by_score_min(seeded_client):
    seeded_client.patch("/api/books/hash_a/personal", json={"score": 5})
    seeded_client.patch("/api/books/hash_b/personal", json={"score": 3})
    r = seeded_client.get("/api/books?score_min=4")
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["file_hash"] == "hash_a"


def test_filter_by_score_max(seeded_client):
    seeded_client.patch("/api/books/hash_a/personal", json={"score": 5})
    seeded_client.patch("/api/books/hash_b/personal", json={"score": 2})
    r = seeded_client.get("/api/books?score_max=3")
    items = r.json()["items"]
    assert any(b["file_hash"] == "hash_b" for b in items)
    assert not any(b["file_hash"] == "hash_a" for b in items)

# ── PATCH /api/books/{hash}/metadata ─────────────────────────────────────────

def test_patch_metadata_title(seeded_client):
    r = seeded_client.patch("/api/books/hash_a/metadata", json={"title": "Novo Título"})
    assert r.status_code == 200
    assert r.json()["title"] == "Novo Título"


def test_patch_metadata_summary(seeded_client):
    r = seeded_client.patch("/api/books/hash_a/metadata", json={"summary": "Resumo editado."})
    assert r.status_code == 200
    assert r.json()["summary"] == "Resumo editado."


def test_patch_metadata_tags(seeded_client):
    r = seeded_client.patch("/api/books/hash_a/metadata", json={
        "system_tags": ["D&D"],
        "category_tags": ["Supplement"],
        "genre_tags": ["Horror"],
        "custom_tags": ["favorito"],
    })
    assert r.status_code == 200
    data = r.json()
    assert data["system_tags"] == ["D&D"]
    assert data["category_tags"] == ["Supplement"]
    assert data["genre_tags"] == ["Horror"]
    assert data["custom_tags"] == ["favorito"]


def test_patch_metadata_partial(seeded_client):
    seeded_client.patch("/api/books/hash_a/metadata", json={"title": "Título A"})
    r = seeded_client.get("/api/books/hash_a")
    assert r.json()["title"] == "Título A"
    assert r.json()["system_tags"] == ["OSR"]  # inalterado


def test_patch_metadata_not_found(seeded_client):
    r = seeded_client.patch("/api/books/nonexistent/metadata", json={"title": "X"})
    assert r.status_code == 404


def test_patch_metadata_empty_title_rejected(seeded_client):
    r = seeded_client.patch("/api/books/hash_a/metadata", json={"title": ""})
    assert r.status_code == 422


def test_patch_metadata_updates_fts(seeded_client):
    seeded_client.patch("/api/books/hash_a/metadata", json={"title": "Título Único FTS"})
    r = seeded_client.get("/api/books?q=Único")
    items = r.json()["items"]
    assert any(b["file_hash"] == "hash_a" for b in items)
