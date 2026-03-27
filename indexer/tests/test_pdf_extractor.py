"""Testes para pdf_extractor.py."""
import pytest
from pathlib import Path
from src.pdf_extractor import extract_pdf_metadata, generate_thumbnail, extract_text_sample


@pytest.fixture
def simple_pdf(tmp_path):
    """PDF real mínimo gerado com reportlab."""
    try:
        from reportlab.pdfgen import canvas
        path = tmp_path / "simple.pdf"
        c = canvas.Canvas(str(path))
        c.setTitle("Simple Test Book")
        c.drawString(100, 750, "This is a simple RPG rulebook for testing.")
        c.showPage()
        c.drawString(100, 750, "Page 2 content.")
        c.showPage()
        c.save()
        return path
    except ImportError:
        pytest.skip("reportlab not installed")


def test_extract_title_from_metadata(simple_pdf):
    meta = extract_pdf_metadata(simple_pdf)
    assert meta["title"] == "Simple Test Book"


def test_extract_page_count(simple_pdf):
    meta = extract_pdf_metadata(simple_pdf)
    assert meta["page_count"] == 2


def test_extract_file_size(simple_pdf):
    meta = extract_pdf_metadata(simple_pdf)
    assert meta["file_size"] == simple_pdf.stat().st_size
    assert meta["file_size"] > 0


def test_fallback_title_from_filename(tmp_path):
    """PDF sem metadata de título usa o filename."""
    from reportlab.pdfgen import canvas
    path = tmp_path / "cairn-2e.pdf"
    c = canvas.Canvas(str(path))
    c.drawString(100, 750, "Content")
    c.showPage()
    c.save()
    meta = extract_pdf_metadata(path)
    assert "cairn" in meta["title"].lower() or meta["title"] == "cairn-2e"


def test_generate_thumbnail(simple_pdf, tmp_path):
    out = tmp_path / "thumb.webp"
    generate_thumbnail(simple_pdf, out, width=300, height=420, quality=80)
    assert out.exists()
    assert out.stat().st_size > 0


def test_extract_text_sample(simple_pdf):
    text = extract_text_sample(simple_pdf, max_pages=2)
    assert isinstance(text, str)
    assert len(text) > 0


def test_corrupted_pdf_does_not_raise(tmp_path):
    bad = tmp_path / "corrupted.pdf"
    bad.write_bytes(b"this is not a pdf")
    meta = extract_pdf_metadata(bad)
    # Deve retornar resultado parcial, não lançar exceção
    assert isinstance(meta, dict)
    assert "page_count" in meta


def test_extract_text_corrupted_returns_empty(tmp_path):
    bad = tmp_path / "corrupted.pdf"
    bad.write_bytes(b"not a pdf")
    text = extract_text_sample(bad, max_pages=5)
    assert isinstance(text, str)
