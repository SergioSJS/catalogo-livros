"""Carrega e valida a configuração do indexador a partir de config.yaml + env vars."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


# ── Dataclasses de config ─────────────────────────────────────────────────────

@dataclass
class SourceConfig:
    path: str
    language: str = "en"
    recursive: bool = True
    extra_tags: list[str] = field(default_factory=list)


@dataclass
class ThumbnailConfig:
    width: int = 300
    height: int = 420
    format: str = "webp"
    quality: int = 80


@dataclass
class IndexingConfig:
    min_file_size: int = 10240
    max_llm_file_size: int = 104857600
    llm_sample_pages: int = 5
    batch_size: int = 20


@dataclass
class LLMProviderConfig:
    name: str
    type: str
    model: str
    tasks: list[str]
    env_key: str


@dataclass
class LLMConfig:
    enabled: bool = True
    timeout: int = 120
    providers: list[LLMProviderConfig] = field(default_factory=list)


@dataclass
class TagTaxonomy:
    systems: list[str] = field(default_factory=list)
    categories: list[str] = field(default_factory=list)
    genres: list[str] = field(default_factory=list)


@dataclass
class AppConfig:
    sources: list[SourceConfig]
    rpg_base_path: str
    database_path: str
    thumbnails_dir: str
    file_extensions: list[str] = field(default_factory=lambda: [".pdf"])
    thumbnail: ThumbnailConfig = field(default_factory=ThumbnailConfig)
    indexing: IndexingConfig = field(default_factory=IndexingConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    tag_taxonomy: TagTaxonomy = field(default_factory=TagTaxonomy)


# ── Loader ────────────────────────────────────────────────────────────────────

def load_config(config_path: str | Path) -> AppConfig:
    """Carrega config.yaml e aplica overrides de env vars."""
    config_path = Path(config_path)
    raw: dict[str, Any] = yaml.safe_load(config_path.read_text())

    if not isinstance(raw.get("sources"), list):
        raise ValueError("'sources' deve ser uma lista de objetos")

    sources = [
        SourceConfig(
            path=s["path"],
            language=s.get("language", "en"),
            recursive=s.get("recursive", True),
            extra_tags=s.get("extra_tags", []),
        )
        for s in raw["sources"]
    ]

    rpg_base = os.environ.get("RPG_BASE_PATH", raw.get("rpg_base_path", "/data/rpg"))
    db_path = os.environ.get("DATABASE_PATH", raw.get("database_path", "/data/db/catalog.db"))
    thumbs_dir = os.environ.get("THUMBNAILS_DIR", raw.get("thumbnails_dir", "/data/thumbnails"))

    thumb_raw = raw.get("thumbnail", {})
    thumbnail = ThumbnailConfig(
        width=thumb_raw.get("width", 300),
        height=thumb_raw.get("height", 420),
        format=thumb_raw.get("format", "webp"),
        quality=thumb_raw.get("quality", 80),
    )

    idx_raw = raw.get("indexing", {})
    indexing = IndexingConfig(
        min_file_size=idx_raw.get("min_file_size", 10240),
        max_llm_file_size=idx_raw.get("max_llm_file_size", 104857600),
        llm_sample_pages=idx_raw.get("llm_sample_pages", 5),
        batch_size=idx_raw.get("batch_size", 20),
    )

    llm_raw = raw.get("llm", {})
    providers = [
        LLMProviderConfig(
            name=p["name"],
            type=p["type"],
            model=p["model"],
            tasks=p.get("tasks", []),
            env_key=p.get("env_key", ""),
        )
        for p in llm_raw.get("providers", [])
    ]
    llm = LLMConfig(
        enabled=llm_raw.get("enabled", True),
        timeout=llm_raw.get("timeout", 120),
        providers=providers,
    )

    tax_raw = raw.get("tag_taxonomy", {})
    taxonomy = TagTaxonomy(
        systems=tax_raw.get("systems", []),
        categories=tax_raw.get("categories", []),
        genres=tax_raw.get("genres", []),
    )

    return AppConfig(
        sources=sources,
        rpg_base_path=rpg_base,
        database_path=db_path,
        thumbnails_dir=thumbs_dir,
        file_extensions=raw.get("file_extensions", [".pdf"]),
        thumbnail=thumbnail,
        indexing=indexing,
        llm=llm,
        tag_taxonomy=taxonomy,
    )
