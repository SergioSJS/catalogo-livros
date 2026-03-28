"""Testes para enrichment.py — prompts, parse e fallback."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from src.enrichment import EnrichmentService, TagResult


TAXONOMY = {
    "systems": ["Mausritter", "OSR", "PbtA", "Other"],
    "categories": ["Core Rulebook", "Supplement", "Other"],
    "genres": ["Fantasy", "Horror", "Other"],
}

SAMPLE_TEXT = "This is a rules-light mouse RPG where you play tiny adventurers exploring dungeons."


@pytest.fixture
def mock_llm_router():
    router = MagicMock()
    router.tag_book = AsyncMock(return_value=TagResult(
        system_tags=["Mausritter", "OSR"],
        category_tags=["Core Rulebook"],
        genre_tags=["Fantasy"],
        custom_tags=["rules-light", "mice"],
        confidence=0.92,
        provider="openrouter-tags",
    ))
    router.summarize_book = AsyncMock(return_value="A rules-light RPG about mouse adventurers.")
    return router


@pytest.mark.asyncio
async def test_enrich_returns_tags(mock_llm_router):
    svc = EnrichmentService(router=mock_llm_router, taxonomy=TAXONOMY)
    result = await svc.enrich(text=SAMPLE_TEXT, language="en")
    assert "Mausritter" in result.system_tags
    assert result.confidence == 0.92


@pytest.mark.asyncio
async def test_enrich_returns_summary(mock_llm_router):
    svc = EnrichmentService(router=mock_llm_router, taxonomy=TAXONOMY)
    result = await svc.enrich(text=SAMPLE_TEXT, language="en")
    assert "mouse" in result.summary.lower()


@pytest.mark.asyncio
async def test_enrich_records_provider(mock_llm_router):
    svc = EnrichmentService(router=mock_llm_router, taxonomy=TAXONOMY)
    result = await svc.enrich(text=SAMPLE_TEXT, language="en")
    assert result.llm_provider == "openrouter-tags"


@pytest.mark.asyncio
async def test_enrich_fallback_on_llm_failure():
    router = MagicMock()
    router.tag_book = AsyncMock(side_effect=Exception("LLM timeout"))
    router.summarize_book = AsyncMock(side_effect=Exception("LLM timeout"))
    svc = EnrichmentService(router=router, taxonomy=TAXONOMY)
    result = await svc.enrich(text=SAMPLE_TEXT, language="en")
    # Fallback gracioso: retorna resultado vazio, não lança exceção
    assert result.system_tags == []
    assert result.summary == ""
    assert result.confidence is None


def test_build_tag_prompt_contains_taxonomy():
    svc = EnrichmentService(router=MagicMock(), taxonomy=TAXONOMY)
    prompt = svc.build_tag_prompt(text=SAMPLE_TEXT)
    assert "Mausritter" in prompt
    assert "Core Rulebook" in prompt
    assert "Fantasy" in prompt


def test_build_tag_prompt_instructs_same_language_for_extra_tags():
    svc = EnrichmentService(router=MagicMock(), taxonomy=TAXONOMY)
    prompt = svc.build_tag_prompt(text=SAMPLE_TEXT)
    assert "brazilian portuguese" in prompt.lower()


def test_parse_json_response_tolerates_markdown():
    svc = EnrichmentService(router=MagicMock(), taxonomy=TAXONOMY)
    raw = '```json\n{"system": "Mausritter", "category": "Core Rulebook", "genre": "Fantasy", "extra_tags": ["rules-light"], "confidence": 0.9}\n```'
    parsed = svc.parse_tag_response(raw)
    assert parsed["system"] == "Mausritter"


def test_parse_json_response_malformed_returns_empty():
    svc = EnrichmentService(router=MagicMock(), taxonomy=TAXONOMY)
    parsed = svc.parse_tag_response("this is not json at all {{{")
    assert parsed == {}
