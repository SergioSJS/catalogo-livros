"""Testes para llm/openrouter.py — HTTP mockado com respx."""
import pytest
import respx
import httpx
from src.llm.openrouter import OpenRouterProvider

TAXONOMY = {
    "systems": ["Mausritter", "OSR", "Other"],
    "categories": ["Core Rulebook", "Other"],
    "genres": ["Fantasy", "Other"],
}

VALID_TAG_RESPONSE = '{"title": "Mausritter", "system": "Mausritter", "category": "Core Rulebook", "genre": "Fantasy", "extra_tags": ["rules-light"], "confidence": 0.92}'
VALID_SUMMARY_RESPONSE = "A rules-light RPG about mouse adventurers exploring dungeons."


@pytest.fixture
def provider(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-123")
    return OpenRouterProvider(
        name="openrouter-tags",
        model="meta-llama/llama-3.1-70b-instruct",
        tasks=["tags", "system_detect"],
        env_key="OPENROUTER_API_KEY",
    )


def test_provider_is_available(provider):
    assert provider.is_available() is True


def test_provider_unavailable_without_key(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    p = OpenRouterProvider(
        name="openrouter-tags",
        model="meta-llama/llama-3.1-70b-instruct",
        tasks=["tags"],
        env_key="OPENROUTER_API_KEY",
    )
    assert p.is_available() is False


@pytest.mark.asyncio
@respx.mock
async def test_tag_book_sends_correct_headers(provider):
    route = respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": VALID_TAG_RESPONSE}}]
        })
    )
    await provider.tag_book(text="some text", taxonomy=TAXONOMY)
    assert route.called
    req = route.calls.last.request
    assert req.headers["Authorization"] == "Bearer test-key-123"
    assert "HTTP-Referer" in req.headers


@pytest.mark.asyncio
@respx.mock
async def test_tag_book_parses_response(provider):
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": VALID_TAG_RESPONSE}}]
        })
    )
    result = await provider.tag_book(text="some text", taxonomy=TAXONOMY)
    assert "Mausritter" in result.system_tags
    assert "Core Rulebook" in result.category_tags
    assert "Fantasy" in result.genre_tags
    assert result.confidence == 0.92
    assert result.provider == "openrouter-tags"


@pytest.mark.asyncio
@respx.mock
async def test_tag_book_tolerates_markdown_json(provider):
    markdown_resp = f"```json\n{VALID_TAG_RESPONSE}\n```"
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": markdown_resp}}]
        })
    )
    result = await provider.tag_book(text="some text", taxonomy=TAXONOMY)
    assert "Mausritter" in result.system_tags


@pytest.mark.asyncio
@respx.mock
async def test_tag_book_returns_empty_on_bad_json(provider):
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": "not json at all"}}]
        })
    )
    result = await provider.tag_book(text="some text", taxonomy=TAXONOMY)
    assert result.system_tags == []
    assert result.confidence is None


@pytest.mark.asyncio
@respx.mock
async def test_tag_book_raises_on_http_error(provider):
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(500, text="Internal Server Error")
    )
    with pytest.raises(Exception):
        await provider.tag_book(text="some text", taxonomy=TAXONOMY)


@pytest.mark.asyncio
@respx.mock
async def test_summarize_book(provider):
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": VALID_SUMMARY_RESPONSE}}]
        })
    )
    result = await provider.summarize_book(text="some text", language="en")
    assert isinstance(result, str)
    assert len(result) > 0


@pytest.mark.asyncio
@respx.mock
async def test_model_is_sent_in_request(provider):
    route = respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={
            "choices": [{"message": {"content": VALID_TAG_RESPONSE}}]
        })
    )
    await provider.tag_book(text="text", taxonomy=TAXONOMY)
    import json
    body = json.loads(route.calls.last.request.content)
    assert body["model"] == "meta-llama/llama-3.1-70b-instruct"
