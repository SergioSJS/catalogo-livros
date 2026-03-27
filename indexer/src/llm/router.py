"""Seleção de provider por task e cascata de fallback."""
from __future__ import annotations

import logging

from src.llm.base import LLMProvider, TagResult

logger = logging.getLogger(__name__)


class LLMRouter:
    def __init__(self, providers: list[LLMProvider]):
        self._providers = providers

    def _for_task(self, task: str) -> list[LLMProvider]:
        """Retorna providers disponíveis para a task, na ordem de declaração."""
        return [
            p for p in self._providers
            if task in p.tasks and p.is_available()
        ]

    async def tag_book(self, text: str, taxonomy: dict) -> TagResult:
        for provider in self._for_task("tags"):
            try:
                result = await provider.tag_book(text=text, taxonomy=taxonomy)
                return result
            except Exception as exc:
                logger.warning("Provider %s failed tagging: %s", provider.name, exc)
        return TagResult.empty()

    async def summarize_book(self, text: str, language: str) -> str:
        for provider in self._for_task("summary"):
            try:
                return await provider.summarize_book(text=text, language=language)
            except Exception as exc:
                logger.warning("Provider %s failed summary: %s", provider.name, exc)
        return ""
