"""Pipeline de indexação: scan → extract → enrich (LLM) → upsert DB → sync FTS → scan_log."""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from src.config import AppConfig
from src.database import Database
from src.models import BookRecord, ScanEntry
from src.pdf_extractor import extract_pdf_metadata, extract_text_sample, generate_thumbnail
from src.scanner import scan_directory


@dataclass
class PipelineResult:
    total_files: int = 0
    new_indexed: int = 0
    skipped: int = 0
    errors: int = 0
    duration_seconds: float = 0.0
    error_log: list[dict] = field(default_factory=list)


class IndexingPipeline:
    def __init__(self, config: AppConfig, db: Database, enrichment_service=None):
        self.config = config
        self.db = db
        self._enrichment = enrichment_service  # None → LLM desabilitado

    def run(self, progress_callback: Callable[[dict], None] | None = None) -> PipelineResult:
        cfg = self.config
        result = PipelineResult()
        start_time = time.time()

        def _update(d: dict) -> None:
            if progress_callback:
                progress_callback(d)

        # ── Fase 1: Scan ──────────────────────────────────────────────────────
        _update({"phase": "scanning"})
        known_fps = self.db.get_scan_log()
        all_scan_results = []

        for source in cfg.sources:
            source_path = Path(cfg.rpg_base_path) / source.path
            if not source_path.exists():
                continue
            scans = scan_directory(
                base_path=source_path,
                extensions=cfg.file_extensions,
                min_size=cfg.indexing.min_file_size,
                known_fingerprints=known_fps,
            )
            # Anota linguagem e extra_tags da source em cada scan result
            for s in scans:
                s._source_language = source.language  # type: ignore[attr-defined]
                s._source_extra_tags = source.extra_tags  # type: ignore[attr-defined]
            all_scan_results.extend(scans)

        active_paths = {str(s.file_path) for s in all_scan_results}
        self.db.remove_deleted_files(active_paths)

        result.total_files = len(all_scan_results)
        _update({"total_files": result.total_files, "phase": "extracting"})

        # ── Fase 2: Extract + Upsert ──────────────────────────────────────────
        thumbs_dir = Path(cfg.thumbnails_dir)
        thumbs_dir.mkdir(parents=True, exist_ok=True)

        for i, scan in enumerate(all_scan_results):
            if scan.is_unchanged:
                result.skipped += 1
                _update({"processed": i + 1, "skipped": result.skipped})
                continue

            _update({"current_file": scan.relative_path, "processed": i + 1})

            try:
                meta = extract_pdf_metadata(scan.file_path)
                thumb_name = f"{scan.file_hash}.webp"
                thumb_path = thumbs_dir / thumb_name
                generate_thumbnail(
                    scan.file_path, thumb_path,
                    width=cfg.thumbnail.width,
                    height=cfg.thumbnail.height,
                    quality=cfg.thumbnail.quality,
                )

                extra_tags: list[str] = getattr(scan, "_source_extra_tags", [])
                language: str = getattr(scan, "_source_language", "en")

                # ── Enriquecimento LLM (opcional) ─────────────────────────
                system_tags: list[str] = []
                category_tags: list[str] = []
                genre_tags: list[str] = []
                merged_custom: list[str] = list(extra_tags)
                summary: str | None = None
                llm_provider: str | None = None
                llm_confidence: float | None = None

                if (self._enrichment is not None
                        and self.config.llm.enabled
                        and meta["file_size"] <= self.config.indexing.max_llm_file_size):
                    _update({"phase": "enriching", "current_file": scan.relative_path})
                    text_sample = extract_text_sample(scan.file_path, self.config.indexing.llm_sample_pages)
                    enriched = asyncio.run(
                        self._enrichment.enrich(text=text_sample, language=language)
                    )
                    system_tags = enriched.system_tags
                    category_tags = enriched.category_tags
                    genre_tags = enriched.genre_tags
                    merged_custom = list(set(extra_tags + enriched.custom_tags))
                    summary = enriched.summary or None
                    llm_provider = enriched.llm_provider
                    llm_confidence = enriched.confidence

                book = BookRecord(
                    file_hash=scan.file_hash,
                    file_path=str(scan.file_path),
                    relative_path=scan.relative_path,
                    filename=scan.file_path.name,
                    parent_folder=scan.parent_folder,
                    title=meta["title"],
                    language=language,
                    file_size=meta["file_size"],
                    page_count=meta["page_count"],
                    thumbnail_file=thumb_name if thumb_path.exists() else None,
                    summary=summary,
                    system_tags=system_tags,
                    category_tags=category_tags,
                    genre_tags=genre_tags,
                    custom_tags=merged_custom,
                    llm_provider=llm_provider,
                    llm_confidence=llm_confidence,
                )

                self.db.upsert_book(book)
                self.db.sync_fts(book)
                self.db.update_scan_log(ScanEntry(
                    file_path=str(scan.file_path),
                    file_hash=scan.file_hash,
                    file_mtime=scan.file_path.stat().st_mtime,
                    file_size=scan.file_path.stat().st_size,
                ))

                result.new_indexed += 1
                _update({"new_files": result.new_indexed})

            except Exception as exc:
                result.errors += 1
                result.error_log.append({
                    "file": scan.relative_path,
                    "error": str(exc),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                _update({"errors": result.errors})

        result.duration_seconds = round(time.time() - start_time, 2)
        _update({"phase": "done", "elapsed_seconds": result.duration_seconds})
        return result
