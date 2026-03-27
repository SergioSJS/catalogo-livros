"""Testes para llm/anthropic.py — HTTP mockado com respx."""
import pytest
import respx
import httpx
from src.llm.anthropic import AnthropicProvider

VALID_SUMMARY = "A rules-light RPG about mice exploring dungeons."


@pytest.fixture
def provider(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-123")
    return AnthropicProvider(
        name="claude-summary",
        model="claude-sonnet-4-20250514",
        tasks=["summary"],
        env_key="ANTHROPIC_API_KEY",
    )


def test_provider_is_available(provider):
    assert provider.is_available() is True


def test_provider_unavailable_without_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    p = AnthropicProvider(
        name="claude-summary",
        model="claude-sonnet-4-20250514",
        tasks=["summary"],
        env_key="ANTHROPIC_API_KEY",
    )
    assert p.is_available() is False


@pytest.mark.asyncio
@respx.mock
async def test_summarize_sends_correct_headers(provider):
    route = respx.post("https://api.anthropic.com/v1/messages").mock(
        return_value=httpx.Response(200, json={
            "content": [{"type": "text", "text": VALID_SUMMARY}]
        })
    )
    await provider.summarize_book(text="some text", language="en")
    assert route.called
    req = route.calls.last.request
    assert req.headers["x-api-key"] == "sk-ant-test-123"
    assert "anthropic-version" in req.headers


@pytest.mark.asyncio
@respx.mock
async def test_summarize_returns_text(provider):
    respx.post("https://api.anthropic.com/v1/messages").mock(
        return_value=httpx.Response(200, json={
            "content": [{"type": "text", "text": VALID_SUMMARY}]
        })
    )
    result = await provider.summarize_book(text="RPG book text", language="en")
    assert result == VALID_SUMMARY


@pytest.mark.asyncio
@respx.mock
async def test_summarize_model_in_request(provider):
    route = respx.post("https://api.anthropic.com/v1/messages").mock(
        return_value=httpx.Response(200, json={
            "content": [{"type": "text", "text": VALID_SUMMARY}]
        })
    )
    await provider.summarize_book(text="text", language="pt")
    import json
    body = json.loads(route.calls.last.request.content)
    assert body["model"] == "claude-sonnet-4-20250514"


@pytest.mark.asyncio
@respx.mock
async def test_summarize_raises_on_http_error(provider):
    respx.post("https://api.anthropic.com/v1/messages").mock(
        return_value=httpx.Response(500, text="Server Error")
    )
    with pytest.raises(Exception):
        await provider.summarize_book(text="text", language="en")


@pytest.mark.asyncio
@respx.mock
async def test_tag_book_returns_tag_result(provider):
    """AnthropicProvider agora implementa tagging via JSON response."""
    respx.post("https://api.anthropic.com/v1/messages").mock(
        return_value=httpx.Response(200, json={
            "content": [{"type": "text", "text": '{"system": "OSR", "category": "Adventure/Module", "genre": "Fantasy", "extra_tags": ["dungeon"], "confidence": 0.9}'}]
        })
    )
    result = await provider.tag_book(text="text", taxonomy={"systems": ["OSR"], "categories": ["Adventure/Module"], "genres": ["Fantasy"]})
    assert result.system_tags == ["OSR"]
    assert result.category_tags == ["Adventure/Module"]
    assert result.genre_tags == ["Fantasy"]
