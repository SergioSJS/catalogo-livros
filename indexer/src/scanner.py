"""Scan recursivo de diretórios de PDFs com detecção de novos/alterados/removidos."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path


@dataclass
class ScanResult:
    file_path: Path
    relative_path: str
    parent_folder: str
    file_hash: str
    fingerprint: str
    is_new: bool = False
    is_changed: bool = False

    @property
    def is_unchanged(self) -> bool:
        return not self.is_new and not self.is_changed


def compute_hash(path: Path) -> str:
    """SHA256 do conteúdo do arquivo."""
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()


def compute_fingerprint(path: Path) -> str:
    """Fingerprint rápido baseado em tamanho e mtime — evita re-hash desnecessário."""
    st = path.stat()
    return f"{st.st_size}:{st.st_mtime}"


def scan_directory(
    base_path: Path,
    extensions: list[str],
    min_size: int,
    known_fingerprints: dict[str, str] | None = None,
) -> list[ScanResult]:
    """
    Varre base_path recursivamente e retorna ScanResult para cada arquivo válido.

    known_fingerprints: {str(file_path): fingerprint} do scan_log.
    Se None, todos os arquivos são tratados como novos.
    """
    if known_fingerprints is None:
        known_fingerprints = {}

    results: list[ScanResult] = []
    ext_set = {e.lower() for e in extensions}

    for file_path in sorted(base_path.rglob("*")):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() not in ext_set:
            continue
        if file_path.stat().st_size < min_size:
            continue

        relative = str(file_path.relative_to(base_path))
        parent_folder = file_path.parent.name

        fp = compute_fingerprint(file_path)
        path_key = str(file_path)
        known_fp = known_fingerprints.get(path_key)

        if known_fp is None:
            is_new = True
            is_changed = False
        elif known_fp != fp:
            is_new = False
            is_changed = True
        else:
            is_new = False
            is_changed = False

        file_hash = compute_hash(file_path)

        results.append(ScanResult(
            file_path=file_path,
            relative_path=relative,
            parent_folder=parent_folder,
            file_hash=file_hash,
            fingerprint=fp,
            is_new=is_new,
            is_changed=is_changed,
        ))

    return results
