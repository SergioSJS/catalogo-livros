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


def test_filter_exclude_system(seeded_client):
    r = seeded_client.get("/api/books?system_not=OSR")
    items = r.json()["items"]
    assert all("OSR" not in b["system_tags"] for b in items)


def test_filter_exclude_system_removes_book(seeded_client):
    r_all = seeded_client.get("/api/books")
    r_exc = seeded_client.get("/api/books?system_not=OSR")
    assert r_exc.json()["pagination"]["total_items"] < r_all.json()["pagination"]["total_items"]


def test_filter_exclude_category(seeded_client):
    r = seeded_client.get("/api/books?category_not=Core+Rulebook")
    items = r.json()["items"]
    assert all("Core Rulebook" not in b["category_tags"] for b in items)


def test_filter_exclude_genre(seeded_client):
    r = seeded_client.get("/api/books?genre_not=Fantasy")
    items = r.json()["items"]
    assert all("Fantasy" not in b["genre_tags"] for b in items)


# ── GET /api/export ───────────────────────────────────────────────────────────

def test_export_json_returns_all_books(seeded_client):
    r = seeded_client.get("/api/export?format=json")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/json")
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 4
    assert all("title" in b for b in data)
    assert all("file_hash" in b for b in data)


def test_export_csv_returns_all_books(seeded_client):
    r = seeded_client.get("/api/export?format=csv")
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    lines = r.text.strip().splitlines()
    assert len(lines) == 5  # header + 4 books
    header = lines[0]
    assert "title" in header
    assert "file_hash" in header


def test_export_json_respects_language_filter(seeded_client):
    r = seeded_client.get("/api/export?format=json&language=pt")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    assert all(b["language"] == "pt" for b in data)


def test_export_csv_respects_system_filter(seeded_client):
    r = seeded_client.get("/api/export?format=csv&system=OSR")
    assert r.status_code == 200
    lines = r.text.strip().splitlines()
    assert len(lines) == 3  # header + 2 OSR books


def test_export_invalid_format_returns_422(seeded_client):
    r = seeded_client.get("/api/export?format=xml")
    assert r.status_code == 422


def test_export_json_content_disposition(seeded_client):
    r = seeded_client.get("/api/export?format=json")
    assert "attachment" in r.headers.get("content-disposition", "")
    assert ".json" in r.headers.get("content-disposition", "")


def test_export_csv_content_disposition(seeded_client):
    r = seeded_client.get("/api/export?format=csv")
    assert "attachment" in r.headers.get("content-disposition", "")
    assert ".csv" in r.headers.get("content-disposition", "")


def test_filter_include_and_exclude_combined(seeded_client):
    # Include books with 'OSR', but exclude those with 'Fantasy' genre
    r = seeded_client.get("/api/books?system=OSR&genre_not=Fantasy")
    items = r.json()["items"]
    assert all("OSR" in b["system_tags"] for b in items)
    assert all("Fantasy" not in b["genre_tags"] for b in items)


# ── PATCH /api/books/bulk ─────────────────────────────────────────────────────

def test_bulk_edit_read_status(seeded_client):
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": ["hash_a", "hash_b"],
        "fields": {"read_status": "read"},
    })
    assert r.status_code == 200
    data = r.json()
    assert data["updated"] == 2
    # Verify persistence
    assert seeded_client.get("/api/books/hash_a").json()["read_status"] == "read"
    assert seeded_client.get("/api/books/hash_b").json()["read_status"] == "read"
    # Untouched book unchanged
    assert seeded_client.get("/api/books/hash_c").json()["read_status"] == "unread"


def test_bulk_edit_score(seeded_client):
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": ["hash_a", "hash_c", "hash_d"],
        "fields": {"score": 4},
    })
    assert r.status_code == 200
    assert r.json()["updated"] == 3
    assert seeded_client.get("/api/books/hash_a").json()["score"] == 4


def test_bulk_edit_solo_friendly(seeded_client):
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": ["hash_b"],
        "fields": {"solo_friendly": True},
    })
    assert r.status_code == 200
    assert seeded_client.get("/api/books/hash_b").json()["solo_friendly"] is True


def test_bulk_edit_empty_hashes_returns_zero(seeded_client):
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": [],
        "fields": {"read_status": "read"},
    })
    assert r.status_code == 200
    assert r.json()["updated"] == 0


def test_bulk_edit_unknown_hashes_ignored(seeded_client):
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": ["nonexistent_1", "nonexistent_2"],
        "fields": {"read_status": "read"},
    })
    assert r.status_code == 200
    assert r.json()["updated"] == 0


def test_bulk_edit_invalid_field_returns_422(seeded_client):
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": ["hash_a"],
        "fields": {"read_status": "bad_value"},
    })
    assert r.status_code == 422


def test_bulk_edit_mixed_known_unknown_hashes(seeded_client):
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": ["hash_a", "nonexistent"],
        "fields": {"read_status": "read"},
    })
    assert r.status_code == 200
    assert r.json()["updated"] == 1


def test_bulk_add_tags(seeded_client):
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": ["hash_a", "hash_d"],
        "add_tags": {"custom_tags": ["favorito"]},
    })
    assert r.status_code == 200
    assert r.json()["updated"] == 2
    assert "favorito" in seeded_client.get("/api/books/hash_a").json()["custom_tags"]
    assert "favorito" in seeded_client.get("/api/books/hash_d").json()["custom_tags"]


def test_bulk_add_tags_no_duplicate(seeded_client):
    # hash_a already has OSR in system_tags
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": ["hash_a"],
        "add_tags": {"system_tags": ["OSR"]},
    })
    assert r.status_code == 200
    tags = seeded_client.get("/api/books/hash_a").json()["system_tags"]
    assert tags.count("OSR") == 1


def test_bulk_remove_tags(seeded_client):
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": ["hash_a", "hash_d"],
        "remove_tags": {"system_tags": ["OSR"]},
    })
    assert r.status_code == 200
    assert r.json()["updated"] == 2
    assert "OSR" not in seeded_client.get("/api/books/hash_a").json()["system_tags"]
    assert "OSR" not in seeded_client.get("/api/books/hash_d").json()["system_tags"]


def test_bulk_remove_tags_noop_if_not_present(seeded_client):
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": ["hash_b"],
        "remove_tags": {"system_tags": ["OSR"]},  # hash_b has PbtA not OSR
    })
    assert r.status_code == 200
    assert r.json()["updated"] == 1  # still counts as updated (operation ran)
    # PbtA still there
    assert "PbtA" in seeded_client.get("/api/books/hash_b").json()["system_tags"]


def test_bulk_add_and_personal_together(seeded_client):
    r = seeded_client.patch("/api/books/bulk", json={
        "file_hashes": ["hash_a"],
        "fields": {"read_status": "read"},
        "add_tags": {"custom_tags": ["novo"]},
    })
    assert r.status_code == 200
    data = seeded_client.get("/api/books/hash_a").json()
    assert data["read_status"] == "read"
    assert "novo" in data["custom_tags"]
