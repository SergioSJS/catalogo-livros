"""SQLite CRUD, FTS5 e queries de catálogo."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from src.models import BookRecord, ScanEntry, IndexRun


_SORT_MAP = {
    "title_asc": "b.title ASC",
    "title_desc": "b.title DESC",
    "pages_asc": "b.page_count ASC",
    "pages_desc": "b.page_count DESC",
    "size_asc": "b.file_size ASC",
    "size_desc": "b.file_size DESC",
    "indexed_at_desc": "b.indexed_at DESC",
}

_LANG_LABELS = {"en": "English", "pt": "Português"}


class Database:
    def __init__(self, db_path: str):
        self._path = db_path

    def _connect(self) -> sqlite3.Connection:
        Path(self._path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def execute(self, sql: str, params: tuple = ()) -> sqlite3.Cursor:
        with self._connect() as conn:
            return conn.execute(sql, params)

    # ── Schema ────────────────────────────────────────────────────────────────

    def init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS books (
                    file_hash       TEXT PRIMARY KEY,
                    file_path       TEXT NOT NULL,
                    relative_path   TEXT NOT NULL,
                    filename        TEXT NOT NULL,
                    parent_folder   TEXT NOT NULL,
                    title           TEXT NOT NULL,
                    language        TEXT DEFAULT 'en',
                    file_size       INTEGER DEFAULT 0,
                    page_count      INTEGER DEFAULT 0,
                    thumbnail_file  TEXT,
                    summary         TEXT,
                    system_tags     TEXT DEFAULT '[]',
                    category_tags   TEXT DEFAULT '[]',
                    genre_tags      TEXT DEFAULT '[]',
                    custom_tags     TEXT DEFAULT '[]',
                    llm_provider    TEXT,
                    llm_confidence  REAL,
                    indexed_at      TEXT NOT NULL,
                    updated_at      TEXT NOT NULL,
                    read_status     TEXT DEFAULT 'unread',
                    played_status   TEXT DEFAULT 'unplayed',
                    solo_friendly   INTEGER DEFAULT 0,
                    review          TEXT,
                    score           INTEGER
                );

                CREATE INDEX IF NOT EXISTS idx_books_language ON books(language);
                CREATE INDEX IF NOT EXISTS idx_books_parent ON books(parent_folder);

                CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
                    file_hash UNINDEXED,
                    title,
                    filename,
                    parent_folder,
                    summary,
                    system_tags,
                    category_tags,
                    genre_tags,
                    custom_tags,
                    tokenize='unicode61 remove_diacritics 2'
                );

                CREATE TABLE IF NOT EXISTS scan_log (
                    file_path       TEXT PRIMARY KEY,
                    file_hash       TEXT NOT NULL,
                    file_mtime      REAL,
                    file_size       INTEGER,
                    last_scanned_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS index_runs (
                    job_id          TEXT PRIMARY KEY,
                    started_at      TEXT NOT NULL,
                    finished_at     TEXT,
                    status          TEXT NOT NULL,
                    total_files     INTEGER DEFAULT 0,
                    new_indexed     INTEGER DEFAULT 0,
                    skipped         INTEGER DEFAULT 0,
                    errors          INTEGER DEFAULT 0,
                    error_log       TEXT DEFAULT '[]'
                );
            """)

    def migrate_schema(self) -> None:
        """Adiciona colunas novas a DBs existentes sem as colunas pessoais."""
        migrations = [
            ("read_status",   "TEXT DEFAULT 'unread'"),
            ("played_status", "TEXT DEFAULT 'unplayed'"),
            ("solo_friendly", "INTEGER DEFAULT 0"),
            ("review",        "TEXT"),
            ("score",         "INTEGER"),
        ]
        with self._connect() as conn:
            existing = {row[1] for row in conn.execute("PRAGMA table_info(books)").fetchall()}
            for col, col_def in migrations:
                if col not in existing:
                    conn.execute(f"ALTER TABLE books ADD COLUMN {col} {col_def}")

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def upsert_book(self, book: BookRecord) -> None:
        with self._connect() as conn:
            conn.execute("""
                INSERT INTO books (
                    file_hash, file_path, relative_path, filename, parent_folder,
                    title, language, file_size, page_count, thumbnail_file,
                    summary, system_tags, category_tags, genre_tags, custom_tags,
                    llm_provider, llm_confidence, indexed_at, updated_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(file_hash) DO UPDATE SET
                    file_path=excluded.file_path,
                    relative_path=excluded.relative_path,
                    filename=excluded.filename,
                    parent_folder=excluded.parent_folder,
                    title=excluded.title,
                    language=excluded.language,
                    file_size=excluded.file_size,
                    page_count=excluded.page_count,
                    thumbnail_file=excluded.thumbnail_file,
                    summary=excluded.summary,
                    system_tags=excluded.system_tags,
                    category_tags=excluded.category_tags,
                    genre_tags=excluded.genre_tags,
                    custom_tags=excluded.custom_tags,
                    llm_provider=excluded.llm_provider,
                    llm_confidence=excluded.llm_confidence,
                    updated_at=excluded.updated_at
            """, (
                book.file_hash, book.file_path, book.relative_path, book.filename,
                book.parent_folder, book.title, book.language, book.file_size,
                book.page_count, book.thumbnail_file, book.summary,
                json.dumps(book.system_tags), json.dumps(book.category_tags),
                json.dumps(book.genre_tags), json.dumps(book.custom_tags),
                book.llm_provider, book.llm_confidence,
                book.indexed_at, book.updated_at,
            ))

    def update_enrichment(self, file_hash: str, summary: str | None,
                          system_tags: list, category_tags: list,
                          genre_tags: list, custom_tags: list,
                          llm_provider: str | None, llm_confidence: float | None) -> None:
        """Atualiza apenas os campos de enriquecimento LLM de um livro existente."""
        with self._connect() as conn:
            conn.execute("""
                UPDATE books SET
                    summary=?, system_tags=?, category_tags=?, genre_tags=?,
                    custom_tags=?, llm_provider=?, llm_confidence=?, updated_at=?
                WHERE file_hash=?
            """, (
                summary,
                json.dumps(system_tags), json.dumps(category_tags),
                json.dumps(genre_tags), json.dumps(custom_tags),
                llm_provider, llm_confidence,
                datetime.now(timezone.utc).isoformat(),
                file_hash,
            ))

    def get_hashes_needing_enrichment(self) -> set[str]:
        """Retorna file_hashes de livros sem summary e sem system_tags."""
        with self._connect() as conn:
            rows = conn.execute("""
                SELECT file_hash FROM books
                WHERE (summary IS NULL OR summary = '')
                AND system_tags = '[]'
            """).fetchall()
        return {row[0] for row in rows}

    def get_book(self, file_hash: str) -> BookRecord | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM books WHERE file_hash=?", (file_hash,)).fetchone()
        return _row_to_book(row) if row else None

    def get_random_book(
        self,
        language: str | None = None,
        systems: list[str] | None = None,
        categories: list[str] | None = None,
        genres: list[str] | None = None,
        folder: str | None = None,
        read_status: str | None = None,
        played_status: str | None = None,
        solo_friendly: bool | None = None,
        score_min: int | None = None,
    ) -> BookRecord | None:
        """Retorna um livro aleatório respeitando os filtros ativos."""
        wheres, params = [], []
        if language:
            wheres.append("b.language = ?"); params.append(language)
        if folder:
            wheres.append("b.parent_folder = ?"); params.append(folder)
        if read_status:
            wheres.append("b.read_status = ?"); params.append(read_status)
        if played_status:
            wheres.append("b.played_status = ?"); params.append(played_status)
        if solo_friendly is not None:
            wheres.append("b.solo_friendly = ?"); params.append(1 if solo_friendly else 0)
        if score_min is not None:
            wheres.append("b.score >= ?"); params.append(score_min)
        for s in (systems or []):
            wheres.append("EXISTS (SELECT 1 FROM json_each(b.system_tags) WHERE json_each.value = ?)")
            params.append(s)
        for c in (categories or []):
            wheres.append("EXISTS (SELECT 1 FROM json_each(b.category_tags) WHERE json_each.value = ?)")
            params.append(c)
        for g in (genres or []):
            wheres.append("EXISTS (SELECT 1 FROM json_each(b.genre_tags) WHERE json_each.value = ?)")
            params.append(g)
        where_sql = ("WHERE " + " AND ".join(wheres)) if wheres else ""
        with self._connect() as conn:
            row = conn.execute(
                f"SELECT b.* FROM books b {where_sql} ORDER BY RANDOM() LIMIT 1",
                params,
            ).fetchone()
        return _row_to_book(row) if row else None

    def sync_fts(self, book: BookRecord) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM books_fts WHERE file_hash=?", (book.file_hash,))
            conn.execute("""
                INSERT INTO books_fts (file_hash, title, filename, parent_folder,
                    summary, system_tags, category_tags, genre_tags, custom_tags)
                VALUES (?,?,?,?,?,?,?,?,?)
            """, (
                book.file_hash, book.title, book.filename, book.parent_folder,
                book.summary or "",
                " ".join(book.system_tags), " ".join(book.category_tags),
                " ".join(book.genre_tags), " ".join(book.custom_tags),
            ))

    def remove_deleted_files(self, active_paths: set[str]) -> None:
        with self._connect() as conn:
            all_paths = [r[0] for r in conn.execute("SELECT file_path FROM books").fetchall()]
            to_remove = [p for p in all_paths if p not in active_paths]
            for path in to_remove:
                row = conn.execute("SELECT file_hash FROM books WHERE file_path=?", (path,)).fetchone()
                if row:
                    conn.execute("DELETE FROM books_fts WHERE file_hash=?", (row[0],))
                    conn.execute("DELETE FROM books WHERE file_path=?", (path,))
                conn.execute("DELETE FROM scan_log WHERE file_path=?", (path,))

    def update_book_metadata(self, file_hash: str, **kwargs) -> None:
        """Atualiza título, resumo e/ou tags. Ressincroniza FTS."""
        tag_fields = {"system_tags", "category_tags", "genre_tags", "custom_tags"}
        allowed = {"title", "summary"} | tag_fields
        fields: dict = {}
        for k, v in kwargs.items():
            if k not in allowed or v is None:
                continue
            fields[k] = json.dumps(v) if k in tag_fields else v
        if not fields:
            return
        fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        set_clause = ", ".join(f"{k}=?" for k in fields)
        with self._connect() as conn:
            conn.execute(
                f"UPDATE books SET {set_clause} WHERE file_hash=?",
                (*fields.values(), file_hash),
            )
        book = self.get_book(file_hash)
        if book:
            self.sync_fts(book)

    def update_personal_fields(self, file_hash: str, **kwargs) -> None:
        """Atualiza campos pessoais (read_status, played_status, solo_friendly, review, score)."""
        allowed = {"read_status", "played_status", "solo_friendly", "review", "score"}
        fields = {k: v for k, v in kwargs.items() if k in allowed}
        if not fields:
            return
        fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        set_clause = ", ".join(f"{k}=?" for k in fields)
        with self._connect() as conn:
            conn.execute(
                f"UPDATE books SET {set_clause} WHERE file_hash=?",
                (*fields.values(), file_hash),
            )

    def clear_scan_log(self) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM scan_log")

    def update_scan_log(self, entry: ScanEntry) -> None:
        with self._connect() as conn:
            conn.execute("""
                INSERT INTO scan_log (file_path, file_hash, file_mtime, file_size, last_scanned_at)
                VALUES (?,?,?,?,?)
                ON CONFLICT(file_path) DO UPDATE SET
                    file_hash=excluded.file_hash,
                    file_mtime=excluded.file_mtime,
                    file_size=excluded.file_size,
                    last_scanned_at=excluded.last_scanned_at
            """, (entry.file_path, entry.file_hash, entry.file_mtime, entry.file_size, entry.last_scanned_at))

    def get_scan_log(self) -> dict[str, str]:
        """Retorna {file_path: fingerprint} do scan_log."""
        with self._connect() as conn:
            rows = conn.execute("SELECT file_path, file_size, file_mtime FROM scan_log").fetchall()
        return {r["file_path"]: f"{r['file_size']}:{r['file_mtime']}" for r in rows}

    # ── Catalog queries ───────────────────────────────────────────────────────

    def list_books(
        self,
        page: int = 1,
        per_page: int = 24,
        q: str | None = None,
        language: str | None = None,
        systems: list[str] | None = None,
        categories: list[str] | None = None,
        genres: list[str] | None = None,
        tags: list[str] | None = None,
        folder: str | None = None,
        sort: str = "title_asc",
        read_status: str | None = None,
        played_status: str | None = None,
        solo_friendly: bool | None = None,
        score_min: int | None = None,
        score_max: int | None = None,
        systems_not: list[str] | None = None,
        categories_not: list[str] | None = None,
        genres_not: list[str] | None = None,
        tags_not: list[str] | None = None,
    ) -> tuple[list[BookRecord], int]:
        order = _SORT_MAP.get(sort, "b.title ASC")
        offset = (page - 1) * per_page

        conditions: list[str] = []
        params: list[Any] = []

        if q:
            # FTS5: join com books_fts e filtra por MATCH
            from_clause = "FROM books b JOIN books_fts fts ON b.file_hash = fts.file_hash"
            conditions.append("books_fts MATCH ?")
            params.append(q + "*")  # prefix match
        else:
            from_clause = "FROM books b"

        if language:
            conditions.append("b.language = ?")
            params.append(language)

        if systems:
            sub = " OR ".join(["json_each.value = ?" for _ in systems])
            conditions.append(
                f"EXISTS (SELECT 1 FROM json_each(b.system_tags) WHERE {sub})"
            )
            params.extend(systems)

        if categories:
            sub = " OR ".join(["json_each.value = ?" for _ in categories])
            conditions.append(
                f"EXISTS (SELECT 1 FROM json_each(b.category_tags) WHERE {sub})"
            )
            params.extend(categories)

        if genres:
            sub = " OR ".join(["json_each.value = ?" for _ in genres])
            conditions.append(
                f"EXISTS (SELECT 1 FROM json_each(b.genre_tags) WHERE {sub})"
            )
            params.extend(genres)

        if tags:
            sub = " OR ".join(["json_each.value = ?" for _ in tags])
            conditions.append(
                f"EXISTS (SELECT 1 FROM json_each(b.custom_tags) WHERE {sub})"
            )
            params.extend(tags)

        if folder:
            conditions.append("b.parent_folder = ?")
            params.append(folder)

        if read_status:
            conditions.append("b.read_status = ?")
            params.append(read_status)

        if played_status:
            conditions.append("b.played_status = ?")
            params.append(played_status)

        if solo_friendly is not None:
            conditions.append("b.solo_friendly = ?")
            params.append(1 if solo_friendly else 0)

        if score_min is not None:
            conditions.append("b.score >= ?")
            params.append(score_min)

        if score_max is not None:
            conditions.append("b.score <= ?")
            params.append(score_max)

        if systems_not:
            for s in systems_not:
                conditions.append(
                    "NOT EXISTS (SELECT 1 FROM json_each(b.system_tags) WHERE json_each.value = ?)"
                )
                params.append(s)

        if categories_not:
            for c in categories_not:
                conditions.append(
                    "NOT EXISTS (SELECT 1 FROM json_each(b.category_tags) WHERE json_each.value = ?)"
                )
                params.append(c)

        if genres_not:
            for g in genres_not:
                conditions.append(
                    "NOT EXISTS (SELECT 1 FROM json_each(b.genre_tags) WHERE json_each.value = ?)"
                )
                params.append(g)

        if tags_not:
            for t in tags_not:
                conditions.append(
                    "NOT EXISTS (SELECT 1 FROM json_each(b.custom_tags) WHERE json_each.value = ?)"
                )
                params.append(t)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        count_sql = f"SELECT COUNT(*) {from_clause} {where}"
        data_sql = f"SELECT b.* {from_clause} {where} ORDER BY {order} LIMIT ? OFFSET ?"

        with self._connect() as conn:
            total = conn.execute(count_sql, params).fetchone()[0]
            rows = conn.execute(data_sql, params + [per_page, offset]).fetchall()

        return [_row_to_book(r) for r in rows], total

    def get_facets(self, language: str | None = None,
                   systems: list[str] | None = None,
                   categories: list[str] | None = None,
                   genres: list[str] | None = None,
                   folder: str | None = None) -> dict:
        # Build shared WHERE conditions
        conditions: list[str] = []
        params: list[Any] = []
        if language:
            conditions.append("language = ?")
            params.append(language)
        for s in (systems or []):
            conditions.append("EXISTS (SELECT 1 FROM json_each(books.system_tags) WHERE json_each.value = ?)")
            params.append(s)
        for c in (categories or []):
            conditions.append("EXISTS (SELECT 1 FROM json_each(books.category_tags) WHERE json_each.value = ?)")
            params.append(c)
        for g in (genres or []):
            conditions.append("EXISTS (SELECT 1 FROM json_each(books.genre_tags) WHERE json_each.value = ?)")
            params.append(g)
        if folder:
            conditions.append("parent_folder = ?")
            params.append(folder)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        with self._connect() as conn:
            # Languages (sempre total, sem filtros)
            lang_rows = conn.execute(
                "SELECT language, COUNT(*) as cnt FROM books GROUP BY language ORDER BY cnt DESC"
            ).fetchall()
            languages = [
                {"value": r["language"], "label": _LANG_LABELS.get(r["language"], r["language"]), "count": r["cnt"]}
                for r in lang_rows
            ]

            # Systems
            sys_rows = conn.execute(f"""
                SELECT json_each.value as val, COUNT(*) as cnt
                FROM books, json_each(books.system_tags)
                {where}
                GROUP BY val ORDER BY cnt DESC
            """, params).fetchall()
            systems_out = [{"value": r["val"], "count": r["cnt"]} for r in sys_rows]

            # Categories
            cat_rows = conn.execute(f"""
                SELECT json_each.value as val, COUNT(*) as cnt
                FROM books, json_each(books.category_tags)
                {where}
                GROUP BY val ORDER BY cnt DESC
            """, params).fetchall()
            categories_out = [{"value": r["val"], "count": r["cnt"]} for r in cat_rows]

            # Genres
            gen_rows = conn.execute(f"""
                SELECT json_each.value as val, COUNT(*) as cnt
                FROM books, json_each(books.genre_tags)
                {where}
                GROUP BY val ORDER BY cnt DESC
            """, params).fetchall()
            genres_out = [{"value": r["val"], "count": r["cnt"]} for r in gen_rows]

            # Folders
            fol_rows = conn.execute(f"""
                SELECT parent_folder as val, COUNT(*) as cnt
                FROM books {where}
                GROUP BY parent_folder ORDER BY cnt DESC
            """, params).fetchall()
            folders_out = [{"value": r["val"], "count": r["cnt"]} for r in fol_rows]

        return {
            "languages": languages,
            "systems": systems_out,
            "categories": categories_out,
            "genres": genres_out,
            "folders": folders_out,
        }

    def get_stats(self) -> dict:
        with self._connect() as conn:
            row = conn.execute("""
                SELECT
                    COUNT(*) as total_books,
                    COALESCE(SUM(file_size), 0) as total_size,
                    COALESCE(SUM(page_count), 0) as total_pages,
                    MIN(indexed_at) as oldest,
                    MAX(indexed_at) as newest
                FROM books
            """).fetchone()

            lang_rows = conn.execute(
                "SELECT language, COUNT(*) as cnt FROM books GROUP BY language"
            ).fetchall()

            sys_rows = conn.execute("""
                SELECT json_each.value as val, COUNT(*) as cnt
                FROM books, json_each(books.system_tags)
                GROUP BY val ORDER BY cnt DESC LIMIT 10
            """).fetchall()

            cat_rows = conn.execute("""
                SELECT json_each.value as val, COUNT(*) as cnt
                FROM books, json_each(books.category_tags)
                GROUP BY val ORDER BY cnt DESC
            """).fetchall()

        from src.models import _human_size
        return {
            "total_books": row["total_books"],
            "total_size_bytes": row["total_size"],
            "total_size_human": _human_size(row["total_size"]),
            "total_pages": row["total_pages"],
            "by_language": {r["language"]: r["cnt"] for r in lang_rows},
            "by_system_top10": [{"value": r["val"], "count": r["cnt"]} for r in sys_rows],
            "by_category": [{"value": r["val"], "count": r["cnt"]} for r in cat_rows],
            "oldest_indexed": row["oldest"],
            "newest_indexed": row["newest"],
        }

    # ── Index runs ────────────────────────────────────────────────────────────

    def save_index_run(self, run: IndexRun) -> None:
        with self._connect() as conn:
            conn.execute("""
                INSERT INTO index_runs (job_id, started_at, finished_at, status,
                    total_files, new_indexed, skipped, errors, error_log)
                VALUES (?,?,?,?,?,?,?,?,?)
                ON CONFLICT(job_id) DO UPDATE SET
                    finished_at=excluded.finished_at,
                    status=excluded.status,
                    total_files=excluded.total_files,
                    new_indexed=excluded.new_indexed,
                    skipped=excluded.skipped,
                    errors=excluded.errors,
                    error_log=excluded.error_log
            """, (
                run.job_id, run.started_at, run.finished_at, run.status,
                run.total_files, run.new_indexed, run.skipped, run.errors,
                json.dumps(run.error_log),
            ))

    def get_last_run(self) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM index_runs ORDER BY started_at DESC LIMIT 1"
            ).fetchone()
        if not row:
            return None
        return {
            "job_id": row["job_id"],
            "finished_at": row["finished_at"],
            "status": row["status"],
            "total_indexed": row["total_files"],
            "new_indexed": row["new_indexed"],
            "errors": row["errors"],
            "duration_seconds": None,
        }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _row_to_book(row: sqlite3.Row) -> BookRecord:
    return BookRecord(
        file_hash=row["file_hash"],
        file_path=row["file_path"],
        relative_path=row["relative_path"],
        filename=row["filename"],
        parent_folder=row["parent_folder"],
        title=row["title"],
        language=row["language"],
        file_size=row["file_size"],
        page_count=row["page_count"],
        thumbnail_file=row["thumbnail_file"],
        summary=row["summary"],
        system_tags=json.loads(row["system_tags"] or "[]"),
        category_tags=json.loads(row["category_tags"] or "[]"),
        genre_tags=json.loads(row["genre_tags"] or "[]"),
        custom_tags=json.loads(row["custom_tags"] or "[]"),
        llm_provider=row["llm_provider"],
        llm_confidence=row["llm_confidence"],
        indexed_at=row["indexed_at"],
        updated_at=row["updated_at"],
        read_status=row["read_status"] or "unread",
        played_status=row["played_status"] or "unplayed",
        solo_friendly=bool(row["solo_friendly"]),
        review=row["review"],
        score=row["score"],
    )
