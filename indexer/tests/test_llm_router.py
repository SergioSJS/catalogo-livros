"""Testes para llm/router.py — seleção de provider e fallback."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from src.llm.router import LLMRouter
from src.llm.base import TagResult


TAXONOMY = {"systems": ["OSR"], "categories": ["Core Rulebook"], "genres": ["Fantasy"]}


def make_provider(name, tasks, success=True, result=None):
    p = MagicMock()
    p.name = name
    p.tasks = tasks
    p.is_available = MagicMock(return_value=True)
    if success:
        p.tag_book = AsyncMock(return_value=result or TagResult(
            system_tags=["OSR"], category_tags=[], genre_tags=[], custom_tags=[], confidence=0.8, provider=name
        ))
        p.summarize_book = AsyncMock(return_value="A summary from " + name)
    else:
        p.tag_book = AsyncMock(side_effect=Exception(f"{name} failed"))
        p.summarize_book = AsyncMock(side_effect=Exception(f"{name} failed"))
    return p


@pytest.mark.asyncio
async def test_router_uses_primary_for_tags():
    primary = make_provider("openrouter-tags", ["tags"])
    fallback = make_provider("gemini-fallback", ["tags", "summary"])
    router = LLMRouter(providers=[primary, fallback])
    result = await router.tag_book(text="text", taxonomy=TAXONOMY)
    assert result.provider == "openrouter-tags"
    primary.tag_book.assert_called_once()
    fallback.tag_book.assert_not_called()


@pytest.mark.asyncio
async def test_router_falls_back_on_primary_failure():
    primary = make_provider("openrouter-tags", ["tags"], success=False)
    fallback = make_provider("gemini-fallback", ["tags", "summary"])
    router = LLMRouter(providers=[primary, fallback])
    result = await router.tag_book(text="text", taxonomy=TAXONOMY)
    assert result.provider == "gemini-fallback"


@pytest.mark.asyncio
async def test_router_returns_empty_when_all_fail():
    p1 = make_provider("p1", ["tags"], success=False)
    p2 = make_provider("p2", ["tags"], success=False)
    router = LLMRouter(providers=[p1, p2])
    result = await router.tag_book(text="text", taxonomy=TAXONOMY)
    assert result.system_tags == []
    assert result.confidence is None


@pytest.mark.asyncio
async def test_router_skips_unavailable_provider():
    primary = make_provider("openrouter-tags", ["tags"])
    primary.is_available = MagicMock(return_value=False)
    fallback = make_provider("gemini-fallback", ["tags"])
    router = LLMRouter(providers=[primary, fallback])
    result = await router.tag_book(text="text", taxonomy=TAXONOMY)
    assert result.provider == "gemini-fallback"
    primary.tag_book.assert_not_called()


@pytest.mark.asyncio
async def test_router_uses_claude_for_summary():
    tagger = make_provider("openrouter-tags", ["tags"])
    claude = make_provider("claude-summary", ["summary"])
    router = LLMRouter(providers=[tagger, claude])
    summary = await router.summarize_book(text="text", language="en")
    assert "claude-summary" in summary
    claude.summarize_book.assert_called_once()
    tagger.summarize_book.assert_not_called()
