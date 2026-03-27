"""Contrato ABC para providers LLM + TagResult."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class TagResult:
    system_tags: list[str] = field(default_factory=list)
    category_tags: list[str] = field(default_factory=list)
    genre_tags: list[str] = field(default_factory=list)
    custom_tags: list[str] = field(default_factory=list)
    confidence: float | None = None
    provider: str | None = None

    @classmethod
    def empty(cls) -> "TagResult":
        return cls()


class LLMProvider(ABC):
    name: str
    tasks: list[str]

    @abstractmethod
    def is_available(self) -> bool:
        """True se a env key necessária está configurada."""

    @abstractmethod
    async def tag_book(self, text: str, taxonomy: dict) -> TagResult:
        """Classifica o livro e retorna tags estruturadas."""

    @abstractmethod
    async def summarize_book(self, text: str, language: str) -> str:
        """Gera resumo de 2-3 frases."""
