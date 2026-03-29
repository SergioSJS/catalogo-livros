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


def test_list_books_fts_by_review(db):
    """Busca por texto no campo review deve encontrar o livro."""
    book = make_book("a")
    db.upsert_book(book)
    db.update_personal_fields("hash_a", review="Excelente regras para iniciantes")
    updated = db.get_book("hash_a")
    db.sync_fts(updated)
    items, total = db.list_books(page=1, per_page=24, q="iniciantes")
    assert total >= 1
    assert any(b.file_hash == "hash_a" for b in items)


def test_migrate_schema_rebuilds_fts_with_review(tmp_path):
    """DB com FTS sem coluna review deve ter o FTS recriado com review."""
    import sqlite3
    db_path = str(tmp_path / "old.db")
    conn = sqlite3.connect(db_path)
    conn.execute("""CREATE TABLE books (
        file_hash TEXT PRIMARY KEY, file_path TEXT NOT NULL,
        relative_path TEXT NOT NULL, filename TEXT NOT NULL,
        parent_folder TEXT NOT NULL, title TEXT NOT NULL,
        language TEXT DEFAULT 'en', file_size INTEGER DEFAULT 0,
        page_count INTEGER DEFAULT 0, thumbnail_file TEXT,
        summary TEXT, system_tags TEXT DEFAULT '[]',
        category_tags TEXT DEFAULT '[]', genre_tags TEXT DEFAULT '[]',
        custom_tags TEXT DEFAULT '[]', llm_provider TEXT,
        llm_confidence REAL, indexed_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )""")
    conn.execute("""CREATE VIRTUAL TABLE books_fts USING fts5(
        file_hash UNINDEXED, title, filename, parent_folder,
        summary, system_tags, category_tags, genre_tags, custom_tags,
        tokenize='unicode61 remove_diacritics 2'
    )""")
    conn.commit()
    conn.close()

    db = Database(db_path)
    db.migrate_schema()

    # Check that the FTS table now includes review
    with db._connect() as conn:
        sql = conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='books_fts'"
        ).fetchone()[0]
    assert "review" in sql


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


# ── Campos pessoais ───────────────────────────────────────────────────────────

def test_schema_has_personal_fields(db):
    cols = {row[1] for row in db.execute("PRAGMA table_info(books)").fetchall()}
    assert "read_status" in cols
    assert "played_status" in cols
    assert "solo_friendly" in cols
    assert "review" in cols
    assert "score" in cols


def test_migrate_schema_adds_personal_fields(tmp_path):
    """migrate_schema() deve funcionar em DB sem as colunas pessoais."""
    import sqlite3
    db_path = str(tmp_path / "old.db")
    # Cria DB antigo sem as colunas
    conn = sqlite3.connect(db_path)
    conn.execute("""CREATE TABLE books (
        file_hash TEXT PRIMARY KEY, file_path TEXT NOT NULL,
        relative_path TEXT NOT NULL, filename TEXT NOT NULL,
        parent_folder TEXT NOT NULL, title TEXT NOT NULL,
        language TEXT DEFAULT 'en', file_size INTEGER DEFAULT 0,
        page_count INTEGER DEFAULT 0, thumbnail_file TEXT,
        summary TEXT, system_tags TEXT DEFAULT '[]',
        category_tags TEXT DEFAULT '[]', genre_tags TEXT DEFAULT '[]',
        custom_tags TEXT DEFAULT '[]', llm_provider TEXT,
        llm_confidence REAL, indexed_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )""")
    conn.commit()
    conn.close()

    db = Database(db_path)
    db.migrate_schema()
    cols = {row[1] for row in db.execute("PRAGMA table_info(books)").fetchall()}
    assert "read_status" in cols
    assert "score" in cols


def test_update_personal_fields(db):
    book = make_book("a")
    db.upsert_book(book)
    db.update_personal_fields("hash_a", read_status="read", score=4, review="Muito bom!")
    row = db.get_book("hash_a")
    assert row.read_status == "read"
    assert row.score == 4
    assert row.review == "Muito bom!"


def test_update_personal_fields_partial(db):
    book = make_book("a")
    db.upsert_book(book)
    db.update_personal_fields("hash_a", read_status="reading")
    row = db.get_book("hash_a")
    assert row.read_status == "reading"
    assert row.score is None  # não foi alterado


def test_update_personal_fields_unknown_hash_no_error(db):
    # Não deve lançar exceção para hash inexistente
    db.update_personal_fields("nonexistent", read_status="read")


# ── NOT filters ──────────────────────────────────────────────────────────────

def test_list_books_exclude_system(seeded_db):
    results, total = seeded_db.list_books(systems_not=["OSR"])
    hashes = [b.file_hash for b in results]
    assert "hash_a" not in hashes  # has OSR
    assert "hash_b" not in hashes  # has OSR
    assert "hash_c" in hashes      # PbtA only
    assert "hash_d" in hashes      # PbtA only


def test_list_books_exclude_category(seeded_db):
    results, _ = seeded_db.list_books(categories_not=["Core Rulebook"])
    for b in results:
        assert "Core Rulebook" not in b.category_tags


def test_list_books_exclude_genre(seeded_db):
    results, _ = seeded_db.list_books(genres_not=["Fantasy"])
    for b in results:
        assert "Fantasy" not in b.genre_tags


def test_list_books_include_and_exclude_combined(seeded_db):
    # Include OSR, exclude Horror
    results, _ = seeded_db.list_books(systems=["OSR"], genres_not=["Horror"])
    assert all("OSR" in b.system_tags for b in results)
    assert all("Horror" not in b.genre_tags for b in results)


# ── llm_error / llm_retries columns ──────────────────────────────────────────

def test_schema_has_llm_error_columns(db):
    with db._connect() as conn:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(books)").fetchall()}
    assert "llm_error" in cols
    assert "llm_retries" in cols


def test_set_llm_error(db):
    book = make_book("a")
    db.upsert_book(book)
    db.set_llm_error("hash_a", "Timeout error")
    updated = db.get_book("hash_a")
    assert updated.llm_error == "Timeout error"
    assert updated.llm_retries == 1


def test_set_llm_error_increments_retries(db):
    book = make_book("a")
    db.upsert_book(book)
    db.set_llm_error("hash_a", "Error 1")
    db.set_llm_error("hash_a", "Error 2")
    updated = db.get_book("hash_a")
    assert updated.llm_retries == 2
    assert updated.llm_error == "Error 2"


def test_clear_llm_error(db):
    book = make_book("a")
    db.upsert_book(book)
    db.set_llm_error("hash_a", "Error")
    db.clear_llm_error("hash_a")
    updated = db.get_book("hash_a")
    assert updated.llm_error is None


def test_list_books_with_llm_error(db):
    for s in ("a", "b", "c"):
        db.upsert_book(make_book(s))
    db.set_llm_error("hash_a", "Failed")
    db.set_llm_error("hash_b", "Timeout")
    results, total = db.list_books(has_llm_error=True)
    assert total == 2
    hashes = {b.file_hash for b in results}
    assert hashes == {"hash_a", "hash_b"}


def test_migrate_schema_adds_llm_error_columns(tmp_path):
    """DB sem colunas llm_error deve recebê-las via migrate_schema."""
    db_path = str(tmp_path / "old.db")
    import sqlite3
    conn = sqlite3.connect(db_path)
    conn.execute("""CREATE TABLE books (
        file_hash TEXT PRIMARY KEY, file_path TEXT NOT NULL, relative_path TEXT,
        filename TEXT, parent_folder TEXT, title TEXT, language TEXT,
        file_size INTEGER, page_count INTEGER, thumbnail_file TEXT, summary TEXT,
        system_tags TEXT, category_tags TEXT, genre_tags TEXT, custom_tags TEXT,
        llm_provider TEXT, llm_confidence REAL, indexed_at TEXT, updated_at TEXT
    )""")
    conn.commit()
    conn.close()

    db = Database(db_path)
    db.migrate_schema()

    with db._connect() as conn:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(books)").fetchall()}
    assert "llm_error" in cols
    assert "llm_retries" in cols
