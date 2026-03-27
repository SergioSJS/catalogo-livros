"""Provider Anthropic (Claude) — via httpx direto para evitar conflito com SDK global."""
from __future__ import annotations

import os

import httpx

from src.llm.base import LLMProvider, TagResult

_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
_ANTHROPIC_VERSION = "2023-06-01"

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

    async def tag_book(self, text: str, taxonomy: dict) -> TagResult:
        raise NotImplementedError("AnthropicProvider only handles 'summary' tasks")

    async def summarize_book(self, text: str, language: str) -> str:
        lang_label = "Portuguese" if language == "pt" else "English"
        prompt = _SUMMARY_PROMPT.format(language=lang_label, text=text[:4000])

        payload = {
            "model": self.model,
            "max_tokens": 256,
            "messages": [{"role": "user", "content": prompt}],
        }
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(_ANTHROPIC_URL, headers=self._headers(), json=payload)
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]
