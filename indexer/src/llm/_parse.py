"""Helpers de parse de resposta JSON de LLMs."""
from __future__ import annotations

import json
import re


def extract_json(text: str) -> dict:
    """
    Extrai JSON de uma string de resposta LLM.
    Tolerante a markdown code blocks (```json ... ```) e texto extra ao redor.
    Retorna {} em caso de falha.
    """
    # Remove markdown code fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text).replace("```", "").strip()

    # Tenta parse direto
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Tenta encontrar o primeiro objeto JSON na string
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return {}


def parse_tag_json(raw: dict, provider_name: str) -> dict:
    """
    Normaliza a resposta de tagging para campos padronizados.
    system pode ser string ou lista.
    """
    def _to_list(val) -> list[str]:
        if isinstance(val, list):
            return [str(v) for v in val if v]
        if isinstance(val, str) and val:
            return [val]
        return []

    system = raw.get("system", raw.get("system_tags", ""))
    category = raw.get("category", raw.get("category_tags", ""))
    genre = raw.get("genre", raw.get("genre_tags", ""))
    extra = raw.get("extra_tags", raw.get("custom_tags", []))

    return {
        "system_tags": _to_list(system),
        "category_tags": _to_list(category),
        "genre_tags": _to_list(genre),
        "custom_tags": _to_list(extra),
        "confidence": raw.get("confidence"),
        "provider": provider_name,
    }
