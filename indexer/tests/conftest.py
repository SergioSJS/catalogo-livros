"""Fixtures compartilhadas entre todos os testes."""
import shutil
import sqlite3
import tempfile
from pathlib import Path

import pytest
import yaml


@pytest.fixture
def tmp_dir(tmp_path):
    """Diretório temporário limpo por teste."""
    return tmp_path


@pytest.fixture
def config_test_yaml(tmp_path):
    """Retorna path do config_test.yaml com paths reais preenchidos."""
    src = Path(__file__).parent / "fixtures" / "config_test.yaml"
    content = src.read_text()
    content = content.replace("__REPLACED_BY_FIXTURE__", str(tmp_path))

    cfg_path = tmp_path / "config_test.yaml"
    cfg_path.write_text(content)
    return cfg_path


@pytest.fixture
def sample_tree(tmp_path):
    """Cria árvore de arquivos simulando /data/rpg com PDFs mínimos."""
    base = tmp_path / "rpg"
    (base / "EN" / "Mausritter").mkdir(parents=True)
    (base / "EN" / "Cairn").mkdir(parents=True)
    (base / "PT" / "OLD DRAGON 2").mkdir(parents=True)
    (base / "PT" / "Ordem Paranormal" / "Livros e Suplementos").mkdir(parents=True)

    # PDFs reais com conteúdo único por arquivo (usando reportlab)
    try:
        from reportlab.pdfgen import canvas as rl_canvas

        def _make_pdf(path: Path, title: str, body: str) -> None:
            c = rl_canvas.Canvas(str(path))
            c.setTitle(title)
            c.drawString(72, 720, body)
            c.showPage()
            c.save()

        _make_pdf(base / "EN" / "Mausritter" / "mausritter-core.pdf",
                  "Mausritter Core Rules", "A rules-light RPG about mice.")
        _make_pdf(base / "EN" / "Cairn" / "cairn-2e.pdf",
                  "Cairn 2e", "An OSR adventure game.")
        _make_pdf(base / "PT" / "OLD DRAGON 2" / "od2-basico.pdf",
                  "Old Dragon 2 Basico", "RPG de fantasia medieval.")
        _make_pdf(base / "PT" / "Ordem Paranormal" / "Livros e Suplementos" / "op-core.pdf",
                  "Ordem Paranormal Core", "RPG de horror paranormal.")
    except ImportError:
        # Fallback: PDFs mínimos válidos com conteúdo único
        pdf_header = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 0\ntrailer\n<< /Size 1 >>\nstartxref\n0\n%%EOF\n"
        files_and_names = [
            (base / "EN" / "Mausritter" / "mausritter-core.pdf", b"mausritter"),
            (base / "EN" / "Cairn" / "cairn-2e.pdf", b"cairn"),
            (base / "PT" / "OLD DRAGON 2" / "od2-basico.pdf", b"old-dragon"),
            (base / "PT" / "Ordem Paranormal" / "Livros e Suplementos" / "op-core.pdf", b"ordem-paranormal"),
        ]
        for f, unique in files_and_names:
            f.write_bytes(pdf_header + unique + b"\n" * 10)

    return base


@pytest.fixture
def in_memory_db():
    """Conexão SQLite in-memory — isolada por teste."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()
