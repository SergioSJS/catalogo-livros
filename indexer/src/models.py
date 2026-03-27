"""Modelos de dados: dataclasses internas e schemas Pydantic para a API."""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel


# ── Dataclasses internas ──────────────────────────────────────────────────────

@dataclass
class BookRecord:
    file_hash: str
    file_path: str
    relative_path: str
    filename: str
    parent_folder: str
    title: str
    language: str = "en"
    file_size: int = 0
    page_count: int = 0
    thumbnail_file: str | None = None
    summary: str | None = None
    system_tags: list[str] = field(default_factory=list)
    category_tags: list[str] = field(default_factory=list)
    genre_tags: list[str] = field(default_factory=list)
    custom_tags: list[str] = field(default_factory=list)
    llm_provider: str | None = None
    llm_confidence: float | None = None
    indexed_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class ScanEntry:
    file_path: str
    file_hash: str
    file_mtime: float
    file_size: int
    last_scanned_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @property
    def fingerprint(self) -> str:
        return f"{self.file_size}:{self.file_mtime}"


@dataclass
class IndexRun:
    job_id: str
    status: str = "running"
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    finished_at: str | None = None
    total_files: int = 0
    new_indexed: int = 0
    skipped: int = 0
    errors: int = 0
    error_log: list[dict] = field(default_factory=list)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _human_size(size_bytes: int) -> str:
    if size_bytes == 0:
        return "0 B"
    units = ("B", "KB", "MB", "GB", "TB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    i = min(i, len(units) - 1)
    p = math.pow(1024, i)
    return f"{size_bytes / p:.1f} {units[i]}"


# ── Schemas Pydantic (API responses) ─────────────────────────────────────────

class BookResponse(BaseModel):
    file_hash: str
    title: str
    filename: str
    parent_folder: str
    language: str
    file_size: int
    file_size_human: str
    page_count: int
    thumbnail_url: str | None
    summary: str | None
    system_tags: list[str]
    category_tags: list[str]
    genre_tags: list[str]
    custom_tags: list[str]
    llm_confidence: float | None
    indexed_at: str

    @classmethod
    def from_record(cls, book: BookRecord) -> "BookResponse":
        thumb = f"/thumbnails/{book.thumbnail_file}" if book.thumbnail_file else None
        return cls(
            file_hash=book.file_hash,
            title=book.title,
            filename=book.filename,
            parent_folder=book.parent_folder,
            language=book.language,
            file_size=book.file_size,
            file_size_human=_human_size(book.file_size),
            page_count=book.page_count,
            thumbnail_url=thumb,
            summary=book.summary,
            system_tags=book.system_tags,
            category_tags=book.category_tags,
            genre_tags=book.genre_tags,
            custom_tags=book.custom_tags,
            llm_confidence=book.llm_confidence,
            indexed_at=book.indexed_at,
        )


class BookDetail(BookResponse):
    relative_path: str
    llm_provider: str | None
    updated_at: str

    @classmethod
    def from_record(cls, book: BookRecord) -> "BookDetail":
        thumb = f"/thumbnails/{book.thumbnail_file}" if book.thumbnail_file else None
        return cls(
            file_hash=book.file_hash,
            title=book.title,
            filename=book.filename,
            relative_path=book.relative_path,
            parent_folder=book.parent_folder,
            language=book.language,
            file_size=book.file_size,
            file_size_human=_human_size(book.file_size),
            page_count=book.page_count,
            thumbnail_url=thumb,
            summary=book.summary,
            system_tags=book.system_tags,
            category_tags=book.category_tags,
            genre_tags=book.genre_tags,
            custom_tags=book.custom_tags,
            llm_provider=book.llm_provider,
            llm_confidence=book.llm_confidence,
            indexed_at=book.indexed_at,
            updated_at=book.updated_at,
        )


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total_items: int
    total_pages: int


class PaginatedBooks(BaseModel):
    items: list[BookResponse]
    pagination: dict[str, Any]


class FacetItem(BaseModel):
    value: str
    count: int


class LanguageFacet(BaseModel):
    value: str
    label: str
    count: int


class FacetsResponse(BaseModel):
    languages: list[LanguageFacet]
    systems: list[FacetItem]
    categories: list[FacetItem]
    genres: list[FacetItem]
    folders: list[FacetItem]


class StatsResponse(BaseModel):
    total_books: int
    total_size_bytes: int
    total_size_human: str
    total_pages: int
    by_language: dict[str, int]
    by_system_top10: list[FacetItem]
    by_category: list[FacetItem]
    oldest_indexed: str | None
    newest_indexed: str | None


class IndexStatusResponse(BaseModel):
    status: str
    current_job: str | None
    progress: dict[str, Any]
    last_run: dict[str, Any] | None
    errors_log: list[dict[str, Any]]
