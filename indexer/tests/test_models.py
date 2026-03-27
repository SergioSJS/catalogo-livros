"""Testes para models.py — BookRecord, ScanEntry, IndexRun e schemas Pydantic."""
import pytest
from src.models import BookRecord, ScanEntry, IndexRun, BookResponse, PaginatedBooks


def test_book_record_creation():
    book = BookRecord(
        file_hash="abc123",
        file_path="/data/rpg/EN/Mausritter/mausritter-core.pdf",
        relative_path="EN/Mausritter/mausritter-core.pdf",
        filename="mausritter-core.pdf",
        parent_folder="Mausritter",
        title="Mausritter",
        language="en",
        file_size=15000,
        page_count=48,
    )
    assert book.file_hash == "abc123"
    assert book.language == "en"
    assert book.system_tags == []
    assert book.category_tags == []
    assert book.genre_tags == []
    assert book.custom_tags == []


def test_book_record_defaults():
    book = BookRecord(
        file_hash="x",
        file_path="/a/b.pdf",
        relative_path="b.pdf",
        filename="b.pdf",
        parent_folder="a",
        title="B",
    )
    assert book.language == "en"
    assert book.file_size == 0
    assert book.page_count == 0
    assert book.thumbnail_file is None
    assert book.summary is None
    assert book.llm_confidence is None


def test_scan_entry_creation():
    entry = ScanEntry(
        file_path="/data/rpg/EN/Mausritter/mausritter-core.pdf",
        file_hash="abc123",
        file_mtime=1711234567.0,
        file_size=15000,
    )
    assert entry.fingerprint == "15000:1711234567.0"


def test_index_run_creation():
    run = IndexRun(job_id="idx-20260326-143000")
    assert run.status == "running"
    assert run.total_files == 0
    assert run.errors == 0


def test_book_response_has_file_size_human():
    import json
    book = BookRecord(
        file_hash="abc",
        file_path="/a/b.pdf",
        relative_path="b.pdf",
        filename="b.pdf",
        parent_folder="a",
        title="B",
        file_size=15728640,
    )
    response = BookResponse.from_record(book)
    assert response.file_size_human == "15.0 MB"


def test_paginated_books_schema():
    result = PaginatedBooks(items=[], pagination={"page": 1, "per_page": 24, "total_items": 0, "total_pages": 0})
    assert result.pagination["total_items"] == 0
