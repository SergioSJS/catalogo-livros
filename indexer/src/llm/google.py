"""Provider Google Gemini — via google-genai SDK."""
from __future__ import annotations

import os

try:
    import google.genai as genai
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore[assignment]
    _GENAI_AVAILABLE = False

from src.llm._parse import extract_json, parse_tag_json
from src.llm.base import LLMProvider, TagResult

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

Text:
---
{text}
---"""


class GoogleProvider(LLMProvider):
    def __init__(self, name: str, model: str, tasks: list[str], env_key: str):
        self.name = name
        self.model = model
        self.tasks = tasks
        self.env_key = env_key

    def is_available(self) -> bool:
        return bool(os.environ.get(self.env_key))

    def _get_client(self):
        api_key = os.environ.get(self.env_key, "")
        return genai.Client(api_key=api_key)

    async def tag_book(self, text: str, taxonomy: dict) -> TagResult:
        prompt = _TAG_PROMPT.format(
            systems=", ".join(taxonomy.get("systems", [])),
            categories=", ".join(taxonomy.get("categories", [])),
            genres=", ".join(taxonomy.get("genres", [])),
            text=text[:4000],
        )
        client = self._get_client()
        resp = await client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
        )
        parsed = extract_json(resp.text)
        if not parsed:
            return TagResult.empty()
        fields = parse_tag_json(parsed, self.name)
        return TagResult(**fields)

    async def summarize_book(self, text: str, language: str) -> str:
        lang_label = "Portuguese" if language == "pt" else "English"
        prompt = _SUMMARY_PROMPT.format(language=lang_label, text=text[:4000])
        client = self._get_client()
        resp = await client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
        )
        return resp.text
