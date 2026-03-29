"""Endpoints de catálogo: GET /api/books, /api/facets, /api/stats."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse

from src.database import Database
from src.models import BookDetail, BookResponse, BookMetadataUpdate, FacetsResponse, PaginatedBooks, StatsResponse, PersonalFieldsUpdate

router = APIRouter(prefix="/api")


def _get_db(db: Database = Depends()) -> Database:
    """Dependência injetada via app.state.db."""
    raise NotImplementedError  # substituído no create_app


@router.get("/books", response_model=PaginatedBooks)
def list_books(
    db: Annotated[Database, Depends(_get_db)],
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=100),
    q: str | None = Query(None),
    language: str | None = Query(None),
    system: list[str] = Query(default=[]),
    category: list[str] = Query(default=[]),
    genre: list[str] = Query(default=[]),
    tag: list[str] = Query(default=[]),
    folder: str | None = Query(None),
    sort: str = Query("title_asc"),
    read_status: str | None = Query(None),
    played_status: str | None = Query(None),
    solo_friendly: bool | None = Query(None),
    score_min: int | None = Query(None, ge=1, le=5),
    score_max: int | None = Query(None, ge=1, le=5),
    system_not: list[str] = Query(default=[]),
    category_not: list[str] = Query(default=[]),
    genre_not: list[str] = Query(default=[]),
    tag_not: list[str] = Query(default=[]),
):
    items, total = db.list_books(
        page=page,
        per_page=per_page,
        q=q or None,
        language=language,
        systems=system or None,
        categories=category or None,
        genres=genre or None,
        tags=tag or None,
        folder=folder,
        sort=sort,
        read_status=read_status,
        played_status=played_status,
        solo_friendly=solo_friendly,
        score_min=score_min,
        score_max=score_max,
        systems_not=system_not or None,
        categories_not=category_not or None,
        genres_not=genre_not or None,
        tags_not=tag_not or None,
    )
    import math
    total_pages = math.ceil(total / per_page) if per_page else 0
    return PaginatedBooks(
        items=[BookResponse.from_record(b) for b in items],
        pagination={
            "page": page,
            "per_page": per_page,
            "total_items": total,
            "total_pages": total_pages,
        },
    )


@router.get("/books/{file_hash}", response_model=BookDetail)
def get_book(file_hash: str, db: Annotated[Database, Depends(_get_db)]):
    book = db.get_book(file_hash)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return BookDetail.from_record(book)


@router.get("/books/{file_hash}/download")
def download_book(file_hash: str, db: Annotated[Database, Depends(_get_db)]):
    book = db.get_book(file_hash)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    import os
    if not os.path.isfile(book.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        path=book.file_path,
        media_type="application/pdf",
        filename=book.filename,
    )


@router.get("/facets")
def get_facets(
    db: Annotated[Database, Depends(_get_db)],
    language: str | None = Query(None),
    system: list[str] = Query(default=[]),
    category: list[str] = Query(default=[]),
    genre: list[str] = Query(default=[]),
    folder: str | None = Query(None),
):
    return db.get_facets(
        language=language,
        systems=system or None,
        categories=category or None,
        genres=genre or None,
        folder=folder,
    )


@router.patch("/books/{file_hash}/personal", response_model=BookResponse)
def update_personal_fields(
    file_hash: str,
    body: PersonalFieldsUpdate,
    db: Annotated[Database, Depends(_get_db)],
):
    book = db.get_book(file_hash)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    db.update_personal_fields(
        file_hash,
        **{k: v for k, v in body.model_dump().items() if v is not None},
    )
    return BookResponse.from_record(db.get_book(file_hash))


@router.patch("/books/{file_hash}/metadata", response_model=BookResponse)
def update_book_metadata(
    file_hash: str,
    body: BookMetadataUpdate,
    db: Annotated[Database, Depends(_get_db)],
):
    book = db.get_book(file_hash)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    db.update_book_metadata(file_hash, **body.model_dump())
    return BookResponse.from_record(db.get_book(file_hash))


@router.get("/stats")
def get_stats(db: Annotated[Database, Depends(_get_db)]):
    return db.get_stats()
