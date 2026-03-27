"""Extração de metadados, thumbnail e texto de PDFs via PyMuPDF."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

try:
    import fitz  # PyMuPDF
    _FITZ_AVAILABLE = True
except ImportError:
    _FITZ_AVAILABLE = False

try:
    from PIL import Image
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False


def _stem_to_title(filename: str) -> str:
    """Converte 'cairn-2e' → 'Cairn 2e'."""
    stem = Path(filename).stem
    # Substitui hífens e underscores por espaço, aplica title case
    title = re.sub(r"[-_]+", " ", stem).strip()
    return title.title()


def extract_pdf_metadata(path: Path) -> dict[str, Any]:
    """
    Extrai metadados de um PDF.
    Retorna resultado parcial em caso de erro — nunca lança exceção.
    """
    result: dict[str, Any] = {
        "title": _stem_to_title(path.name),
        "page_count": 0,
        "file_size": path.stat().st_size if path.exists() else 0,
    }

    if not _FITZ_AVAILABLE:
        return result

    try:
        doc = fitz.open(str(path))
        result["page_count"] = len(doc)

        meta = doc.metadata or {}
        raw_title = (meta.get("title") or "").strip()
        if raw_title and raw_title.lower() not in ("untitled", "untitled document", "unknown"):
            result["title"] = raw_title

        doc.close()
    except Exception:
        pass

    return result


def generate_thumbnail(
    path: Path,
    output: Path,
    width: int = 300,
    height: int = 420,
    quality: int = 80,
) -> bool:
    """
    Renderiza a primeira página do PDF como imagem webp.
    Retorna True em sucesso, False em erro.
    """
    if not _FITZ_AVAILABLE or not _PIL_AVAILABLE:
        return False

    try:
        doc = fitz.open(str(path))
        if len(doc) == 0:
            doc.close()
            return False

        page = doc[0]
        # Escala para cobrir width×height mantendo proporção
        rect = page.rect
        scale = max(width / rect.width, height / rect.height)
        mat = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        doc.close()

        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        # Crop central para exatamente width×height
        left = (img.width - width) // 2
        top = (img.height - height) // 2
        img = img.crop((left, top, left + width, top + height))

        output.parent.mkdir(parents=True, exist_ok=True)
        img.save(str(output), format="WEBP", quality=quality)
        return True
    except Exception:
        return False


def extract_text_sample(path: Path, max_pages: int = 5) -> str:
    """
    Extrai texto das primeiras max_pages páginas.
    Retorna string vazia em caso de erro.
    """
    if not _FITZ_AVAILABLE:
        return ""

    try:
        doc = fitz.open(str(path))
        pages_to_read = min(max_pages, len(doc))
        texts = []
        for i in range(pages_to_read):
            text = doc[i].get_text("text")
            if text.strip():
                texts.append(text.strip())
        doc.close()
        return "\n\n".join(texts)
    except Exception:
        return ""
