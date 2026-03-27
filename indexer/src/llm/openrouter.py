"""Provider OpenRouter — usa API compatível com OpenAI via httpx."""
from __future__ import annotations

import os

import httpx

from src.llm._parse import extract_json, parse_tag_json
from src.llm.base import LLMProvider, TagResult

_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
_REFERER = "https://github.com/sergiojs/rpg-catalog"

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


class OpenRouterProvider(LLMProvider):
    def __init__(self, name: str, model: str, tasks: list[str], env_key: str):
        self.name = name
        self.model = model
        self.tasks = tasks
        self.env_key = env_key

    def is_available(self) -> bool:
        return bool(os.environ.get(self.env_key))

    def _api_key(self) -> str:
        return os.environ.get(self.env_key, "")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._api_key()}",
            "HTTP-Referer": _REFERER,
            "Content-Type": "application/json",
        }

    async def _chat(self, prompt: str) -> str:
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
        }
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(_OPENROUTER_URL, headers=self._headers(), json=payload)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    async def tag_book(self, text: str, taxonomy: dict) -> TagResult:
        prompt = _TAG_PROMPT.format(
            systems=", ".join(taxonomy.get("systems", [])),
            categories=", ".join(taxonomy.get("categories", [])),
            genres=", ".join(taxonomy.get("genres", [])),
            text=text[:4000],
        )
        raw_text = await self._chat(prompt)
        parsed = extract_json(raw_text)
        if not parsed:
            return TagResult.empty()
        fields = parse_tag_json(parsed, self.name)
        return TagResult(**fields)

    async def summarize_book(self, text: str, language: str) -> str:
        lang_label = "Portuguese" if language == "pt" else "English"
        prompt = _SUMMARY_PROMPT.format(language=lang_label, text=text[:4000])
        return await self._chat(prompt)
