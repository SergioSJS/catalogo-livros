"""Testes para scanner.py."""
import time
import pytest
from src.scanner import scan_directory, compute_hash, compute_fingerprint, ScanResult


def test_scan_finds_pdfs_recursively(sample_tree):
    results = scan_directory(sample_tree, extensions=[".pdf"], min_size=1)
    paths = [r.relative_path for r in results]
    assert any("Mausritter" in p for p in paths)
    assert any("OLD DRAGON 2" in p for p in paths)
    assert any("Ordem Paranormal" in p for p in paths)


def test_scan_returns_four_files(sample_tree):
    results = scan_directory(sample_tree, extensions=[".pdf"], min_size=1)
    assert len(results) == 4


def test_scan_filters_by_min_size(sample_tree):
    # Arquivo menor que min_size deve ser ignorado
    tiny = sample_tree / "EN" / "Mausritter" / "tiny.pdf"
    tiny.write_bytes(b"%PDF-1.4")
    results = scan_directory(sample_tree, extensions=[".pdf"], min_size=100)
    paths = [r.relative_path for r in results]
    assert not any("tiny.pdf" in p for p in paths)


def test_scan_filters_by_extension(sample_tree):
    txt = sample_tree / "EN" / "Mausritter" / "notes.txt"
    txt.write_text("notes")
    results = scan_directory(sample_tree, extensions=[".pdf"], min_size=1)
    assert not any("notes.txt" in r.relative_path for r in results)


def test_scan_result_has_parent_folder_flat(sample_tree):
    results = scan_directory(sample_tree, extensions=[".pdf"], min_size=1)
    mausritter = next(r for r in results if "mausritter-core" in r.relative_path)
    assert mausritter.parent_folder == "Mausritter"


def test_scan_result_has_parent_folder_nested(sample_tree):
    results = scan_directory(sample_tree, extensions=[".pdf"], min_size=1)
    op = next(r for r in results if "op-core" in r.relative_path)
    assert op.parent_folder == "Livros e Suplementos"


def test_compute_hash_stable(sample_tree):
    pdf = sample_tree / "EN" / "Mausritter" / "mausritter-core.pdf"
    h1 = compute_hash(pdf)
    h2 = compute_hash(pdf)
    assert h1 == h2
    assert len(h1) == 64  # SHA256 hex


def test_compute_hash_different_files(sample_tree):
    pdf1 = sample_tree / "EN" / "Mausritter" / "mausritter-core.pdf"
    pdf2 = sample_tree / "EN" / "Cairn" / "cairn-2e.pdf"
    assert compute_hash(pdf1) != compute_hash(pdf2)


def test_fingerprint_format(sample_tree):
    pdf = sample_tree / "EN" / "Mausritter" / "mausritter-core.pdf"
    fp = compute_fingerprint(pdf)
    size, mtime = fp.split(":")
    assert int(size) == pdf.stat().st_size
    assert float(mtime) == pdf.stat().st_mtime


def test_scan_detects_new_file(sample_tree):
    """Arquivo não presente em scan_log é marcado como novo."""
    results = scan_directory(sample_tree, extensions=[".pdf"], min_size=1, known_fingerprints={})
    assert all(r.is_new for r in results)


def test_scan_detects_unchanged_file(sample_tree):
    """Arquivo com fingerprint igual é marcado como inalterado."""
    from src.scanner import compute_fingerprint
    pdf = sample_tree / "EN" / "Mausritter" / "mausritter-core.pdf"
    fp = compute_fingerprint(pdf)
    known = {str(pdf): fp}
    results = scan_directory(sample_tree, extensions=[".pdf"], min_size=1, known_fingerprints=known)
    mausritter = next(r for r in results if "mausritter-core" in r.relative_path)
    assert not mausritter.is_new
    assert not mausritter.is_changed


def test_scan_detects_changed_file(sample_tree):
    """Arquivo com fingerprint diferente é marcado como alterado."""
    pdf = sample_tree / "EN" / "Mausritter" / "mausritter-core.pdf"
    known = {str(pdf): "99999:0.0"}  # fingerprint falso
    results = scan_directory(sample_tree, extensions=[".pdf"], min_size=1, known_fingerprints=known)
    mausritter = next(r for r in results if "mausritter-core" in r.relative_path)
    assert mausritter.is_changed
