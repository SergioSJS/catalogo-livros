"""Provider Anthropic (Claude) — via httpx direto para evitar conflito com SDK global."""
from __future__ import annotations

import os

import httpx

from src.llm._parse import extract_json, parse_tag_json
from src.llm.base import LLMProvider, TagResult

_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
_ANTHROPIC_VERSION = "2023-06-01"

_TAG_PROMPT = """\
You are classifying an RPG book for a personal catalog.
Given the text from the first pages, return ONLY valid JSON:

{{
  "title": "best guess at the book title",
  "system": "one of: {systems}",
  "category": "one of: {categories}",
  "genre": "one of: {genres}",
  "extra_tags": ["up to 5 freeform tags"],
  "confidence": 0.0
}}

Text:
---
{text}
---"""

_SUMMARY_PROMPT = """\
Write a 2-3 sentence summary of this RPG book in {language}.
Be specific: setting, mechanics, theme.
Only describe what's evident from the text.

Text from first pages:
---
{text}
---"""


class AnthropicProvider(LLMProvider):
    def __init__(self, name: str, model: str, tasks: list[str], env_key: str):
        self.name = name
        self.model = model
        self.tasks = tasks
        self.env_key = env_key

    def is_available(self) -> bool:
        return bool(os.environ.get(self.env_key))

    def _headers(self) -> dict:
        return {
            "x-api-key": os.environ.get(self.env_key, ""),
            "anthropic-version": _ANTHROPIC_VERSION,
            "content-type": "application/json",
        }

    async def _chat(self, prompt: str, max_tokens: int = 512) -> str:
        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(_ANTHROPIC_URL, headers=self._headers(), json=payload)
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]

    async def tag_book(self, text: str, taxonomy: dict) -> TagResult:
        prompt = _TAG_PROMPT.format(
            systems=", ".join(taxonomy.get("systems", [])),
            categories=", ".join(taxonomy.get("categories", [])),
            genres=", ".join(taxonomy.get("genres", [])),
            text=text[:4000],
        )
        raw_text = await self._chat(prompt, max_tokens=256)
        parsed = extract_json(raw_text)
        if not parsed:
            return TagResult.empty()
        fields = parse_tag_json(parsed, self.name)
        return TagResult(**fields)

    async def summarize_book(self, text: str, language: str) -> str:
        lang_label = "Portuguese" if language == "pt" else "English"
        prompt = _SUMMARY_PROMPT.format(language=lang_label, text=text[:4000])
        return await self._chat(prompt, max_tokens=256)
