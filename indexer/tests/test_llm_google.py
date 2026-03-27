"""Testes para llm/google.py — mock do SDK google-genai."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.llm.google import GoogleProvider

TAXONOMY = {
    "systems": ["OSR", "Other"],
    "categories": ["Core Rulebook", "Other"],
    "genres": ["Fantasy", "Other"],
}
VALID_TAG_RESPONSE = '{"system": "OSR", "category": "Core Rulebook", "genre": "Fantasy", "extra_tags": ["rules-light"], "confidence": 0.85}'
VALID_SUMMARY = "An OSR adventure game about dungeon exploration."


@pytest.fixture
def provider(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEY", "AIza-test-key")
    return GoogleProvider(
        name="gemini-fallback",
        model="gemini-2.0-flash",
        tasks=["tags", "summary", "system_detect"],
        env_key="GOOGLE_API_KEY",
    )


def _mock_genai_client(response_text: str):
    """Helper: retorna patch do genai.Client com resposta mockada."""
    mock_resp = MagicMock()
    mock_resp.text = response_text

    mock_aio_models = MagicMock()
    mock_aio_models.generate_content = AsyncMock(return_value=mock_resp)

    mock_aio = MagicMock()
    mock_aio.models = mock_aio_models

    mock_client = MagicMock()
    mock_client.aio = mock_aio

    mock_genai = MagicMock()
    mock_genai.Client.return_value = mock_client
    return mock_genai


def test_provider_is_available(provider):
    assert provider.is_available() is True


def test_provider_unavailable_without_key(monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    p = GoogleProvider(
        name="gemini-fallback",
        model="gemini-2.0-flash",
        tasks=["tags"],
        env_key="GOOGLE_API_KEY",
    )
    assert p.is_available() is False


@pytest.mark.asyncio
async def test_tag_book_parses_response(provider):
    mock_genai = _mock_genai_client(VALID_TAG_RESPONSE)
    with patch("src.llm.google.genai", mock_genai):
        result = await provider.tag_book(text="some text", taxonomy=TAXONOMY)

    assert "OSR" in result.system_tags
    assert result.confidence == 0.85
    assert result.provider == "gemini-fallback"


@pytest.mark.asyncio
async def test_tag_book_tolerates_markdown_json(provider):
    mock_genai = _mock_genai_client(f"```json\n{VALID_TAG_RESPONSE}\n```")
    with patch("src.llm.google.genai", mock_genai):
        result = await provider.tag_book(text="text", taxonomy=TAXONOMY)

    assert "OSR" in result.system_tags


@pytest.mark.asyncio
async def test_summarize_returns_text(provider):
    mock_genai = _mock_genai_client(VALID_SUMMARY)
    with patch("src.llm.google.genai", mock_genai):
        result = await provider.summarize_book(text="text", language="en")

    assert result == VALID_SUMMARY


@pytest.mark.asyncio
async def test_tag_book_returns_empty_on_bad_json(provider):
    mock_genai = _mock_genai_client("this is not json")
    with patch("src.llm.google.genai", mock_genai):
        result = await provider.tag_book(text="text", taxonomy=TAXONOMY)

    assert result.system_tags == []


@pytest.mark.asyncio
async def test_tag_book_raises_on_sdk_error(provider):
    mock_resp = MagicMock()
    mock_aio_models = MagicMock()
    mock_aio_models.generate_content = AsyncMock(side_effect=Exception("API error"))
    mock_aio = MagicMock()
    mock_aio.models = mock_aio_models
    mock_client = MagicMock()
    mock_client.aio = mock_aio
    mock_genai = MagicMock()
    mock_genai.Client.return_value = mock_client

    with patch("src.llm.google.genai", mock_genai):
        with pytest.raises(Exception):
            await provider.tag_book(text="text", taxonomy=TAXONOMY)
