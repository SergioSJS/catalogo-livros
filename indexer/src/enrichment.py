"""Orquestra chamadas LLM: tags + resumo, com fallback gracioso."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from src.llm._parse import extract_json
from src.llm.base import TagResult
from src.llm.router import LLMRouter

logger = logging.getLogger(__name__)

_TAG_PROMPT = """\
You are classifying an RPG book for a personal catalog.
Given the text from the first pages, return ONLY valid JSON:

{{
  "title": "best guess at the book title",
  "system": "one of: {systems}",
  "category": "one of: {categories}",
  "genre": "one of: {genres}",
  "extra_tags": ["up to 5 freeform tags in Brazilian Portuguese"],
  "confidence": 0.0
}}

Text:
---
{text}
---"""


@dataclass
class EnrichmentResult:
    system_tags: list[str] = field(default_factory=list)
    category_tags: list[str] = field(default_factory=list)
    genre_tags: list[str] = field(default_factory=list)
    custom_tags: list[str] = field(default_factory=list)
    summary: str = ""
    llm_provider: str | None = None
    confidence: float | None = None


class EnrichmentService:
    def __init__(self, router: LLMRouter, taxonomy: dict):
        self._router = router
        self._taxonomy = taxonomy

    def build_tag_prompt(self, text: str) -> str:
        return _TAG_PROMPT.format(
            systems=", ".join(self._taxonomy.get("systems", [])),
            categories=", ".join(self._taxonomy.get("categories", [])),
            genres=", ".join(self._taxonomy.get("genres", [])),
            text=text[:4000],
        )

    def parse_tag_response(self, raw: str) -> dict:
        return extract_json(raw)

    async def enrich(self, text: str, language: str) -> EnrichmentResult:
        result = EnrichmentResult()

        # Tags
        try:
            tag_result: TagResult = await self._router.tag_book(
                text=text, taxonomy=self._taxonomy
            )
            result.system_tags = tag_result.system_tags
            result.category_tags = tag_result.category_tags
            result.genre_tags = tag_result.genre_tags
            result.custom_tags = tag_result.custom_tags
            result.confidence = tag_result.confidence
            result.llm_provider = tag_result.provider
        except Exception as exc:
            logger.warning("Enrichment tagging failed: %s", exc)

        # Resumo
        try:
            result.summary = await self._router.summarize_book(
                text=text, language=language
            )
        except Exception as exc:
            logger.warning("Enrichment summary failed: %s", exc)

        return result
