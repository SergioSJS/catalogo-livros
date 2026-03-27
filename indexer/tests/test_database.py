"""Testes para database.py — schema, CRUD, FTS5 e queries de catálogo."""
import json
import pytest
from src.database import Database
from src.models import BookRecord


def make_book(suffix="a", language="en", system_tags=None, category_tags=None, genre_tags=None):
    return BookRecord(
        file_hash=f"hash_{suffix}",
        file_path=f"/data/rpg/EN/Game{suffix}/book{suffix}.pdf",
        relative_path=f"EN/Game{suffix}/book{suffix}.pdf",
        filename=f"book{suffix}.pdf",
        parent_folder=f"Game{suffix}",
        title=f"Book {suffix}",
        language=language,
        file_size=1024 * (ord(suffix) - ord("a") + 1),
        page_count=10 * (ord(suffix) - ord("a") + 1),
        system_tags=system_tags or [],
        category_tags=category_tags or [],
        genre_tags=genre_tags or [],
    )


@pytest.fixture
def db(tmp_path):
    d = Database(str(tmp_path / "test.db"))
    d.init_schema()
    return d


@pytest.fixture
def seeded_db(db):
    """DB com livros pré-inseridos para testes de catálogo."""
    books = [
        make_book("a", "en", ["Mausritter", "OSR"], ["Core Rulebook"], ["Fantasy"]),
        make_book("b", "en", ["OSR"], ["Supplement"], ["Horror"]),
        make_book("c", "pt", ["PbtA"], ["Core Rulebook"], ["Fantasy"]),
        make_book("d", "pt", ["PbtA"], ["Adventure/Module"], ["Fantasy"]),
    ]
    # Ajusta títulos para teste FTS
    books[0].title = "Mausritter Core Rules"
    books[2].title = "Dragão de Ferro"
    for b in books:
        db.upsert_book(b)
        db.sync_fts(b)
    return db


# ── Schema ────────────────────────────────────────────────────────────────────

def test_schema_creates_tables(db):
    tables = db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    names = {t["name"] for t in tables}
    assert "books" in names
    assert "books_fts" in names
    assert "scan_log" in names
    assert "index_runs" in names


# ── CRUD ──────────────────────────────────────────────────────────────────────

def test_upsert_book_insert(db):
    book = make_book("a")
    db.upsert_book(book)
    row = db.get_book("hash_a")
    assert row is not None
    assert row.title == "Book a"


def test_upsert_book_update(db):
    book = make_book("a")
    db.upsert_book(book)
    book.title = "Updated Title"
    db.upsert_book(book)
    row = db.get_book("hash_a")
    assert row.title == "Updated Title"


def test_upsert_is_idempotent(db):
    book = make_book("a")
    db.upsert_book(book)
    db.upsert_book(book)
    count = db.execute("SELECT COUNT(*) as c FROM books").fetchone()["c"]
    assert count == 1


def test_get_book_not_found(db):
    assert db.get_book("nonexistent") is None


def test_remove_deleted_files(db):
    book = make_book("a")
    db.upsert_book(book)
    db.sync_fts(book)
    db.remove_deleted_files(active_paths=set())
    assert db.get_book("hash_a") is None


# ── list_books ────────────────────────────────────────────────────────────────

def test_list_books_default(seeded_db):
    items, total = seeded_db.list_books(page=1, per_page=24)
    assert total == 4
    assert len(items) == 4


def test_list_books_pagination(seeded_db):
    items, total = seeded_db.list_books(page=1, per_page=2)
    assert total == 4
    assert len(items) == 2


def test_list_books_filter_language(seeded_db):
    items, total = seeded_db.list_books(page=1, per_page=24, language="pt")
    assert total == 2
    assert all(b.language == "pt" for b in items)


def test_list_books_filter_multiple_systems(seeded_db):
    items, total = seeded_db.list_books(page=1, per_page=24, systems=["OSR", "PbtA"])
    assert total == 4  # a(OSR), b(OSR), c(PbtA), d(PbtA)


def test_list_books_filter_system_single(seeded_db):
    items, total = seeded_db.list_books(page=1, per_page=24, systems=["PbtA"])
    assert total == 2
    assert all("PbtA" in b.system_tags for b in items)


def test_list_books_empty_result(seeded_db):
    items, total = seeded_db.list_books(page=1, per_page=24, systems=["GURPS"])
    assert total == 0
    assert items == []


def test_list_books_sort_pages_desc(seeded_db):
    items, _ = seeded_db.list_books(page=1, per_page=24, sort="pages_desc")
    pages = [b.page_count for b in items]
    assert pages == sorted(pages, reverse=True)


# ── FTS ───────────────────────────────────────────────────────────────────────

def test_list_books_fts_by_title(seeded_db):
    items, total = seeded_db.list_books(page=1, per_page=24, q="Mausritter")
    assert total >= 1
    assert any("Mausritter" in b.title for b in items)


def test_list_books_fts_no_diacritics(seeded_db):
    """Busca 'dragao' deve encontrar 'Dragão de Ferro'."""
    items, total = seeded_db.list_books(page=1, per_page=24, q="dragao")
    assert total >= 1
    assert any("Dragão" in b.title for b in items)


# ── get_facets ────────────────────────────────────────────────────────────────

def test_get_facets_languages(seeded_db):
    facets = seeded_db.get_facets()
    langs = {f["value"]: f["count"] for f in facets["languages"]}
    assert langs["en"] == 2
    assert langs["pt"] == 2


def test_get_facets_filtered_by_language(seeded_db):
    facets = seeded_db.get_facets(language="en")
    systems = {f["value"]: f["count"] for f in facets["systems"]}
    assert "PbtA" not in systems or systems.get("PbtA", 0) == 0


# ── get_stats ─────────────────────────────────────────────────────────────────

def test_get_stats(seeded_db):
    stats = seeded_db.get_stats()
    assert stats["total_books"] == 4
    assert stats["by_language"]["en"] == 2
    assert stats["by_language"]["pt"] == 2
