# RPG Book Catalog — Plano de Desenvolvimento (v4)

## 1. Visão Geral

Catálogo pessoal de livros de RPG composto por dois serviços via Docker Compose:

1. **Indexador + API** (Python FastAPI em container) — varre pastas locais, extrai metadados, gera thumbnails, enriquece com LLMs (Claude, Gemini, OpenRouter). Serve o catálogo diretamente do SQLite via endpoints REST paginados com filtros e busca.
2. **Catálogo Web** (SPA React/Vite servida por nginx) — consome a API do indexador para listar, filtrar, buscar livros. Pode disparar e acompanhar indexação.

```
┌──────────────────────────────────────────────────────────────┐
│                     ZIMAOS (Docker Compose)                   │
│                                                               │
│  ┌───────────────────────┐      ┌───────────────────────────┐│
│  │  rpg-indexer            │      │  rpg-catalog (nginx)       ││
│  │  Python + FastAPI       │      │  React SPA (Vite build)    ││
│  │                         │      │                             ││
│  │  === CATALOG API ===    │      │  Consome /api/*             ││
│  │  GET  /api/books        │◄─────│  Grid, filtros, busca       ││
│  │  GET  /api/books/:hash  │◄─────│  Modal de detalhes          ││
│  │  GET  /api/facets       │◄─────│  Contadores nos filtros     ││
│  │  GET  /api/stats        │◄─────│  Dashboard de stats         ││
│  │                         │      │                             ││
│  │  === INDEXING API ===   │      │                             ││
│  │  POST /api/index        │◄─────│  Botão "Reindexar"          ││
│  │  GET  /api/index/status │◄─────│  Progresso + erros          ││
│  │  GET  /api/health       │      │                             ││
│  │                         │      │                             ││
│  │  Volumes:               │      │  Volume:                    ││
│  │   /data/rpg (ro)        │      │   /data/thumbnails (ro)     ││
│  │   /data/thumbnails (rw) │      │                             ││
│  │   /data/db (rw)         │      │                             ││
│  └───────────────────────┘      └───────────────────────────┘│
│                                                               │
│  SQLite é a ÚNICA fonte de verdade. Sem JSON intermediário.   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Princípios

1. **Testes primeiro (TDD)** — cada módulo começa pelos testes antes da implementação.
2. **SQLite como fonte única** — sem JSON de catálogo; a API serve direto do banco.
3. **Repo público** — nenhum secret no código; tudo via env vars e `.env` local.
4. **Docker Compose one-click** — `docker compose up` sobe tudo no ZimaOS.
5. **Fonte de PDFs simplificada** — indexa arquivos locais no servidor; sincronia com Drive é problema resolvido fora do escopo.

---

## 3. Estrutura de Arquivos no Servidor

Baseado no mapeamento real do Google Drive:

```
/data/rpg/                          ← volume montado (read-only)
├── EN/                             ← ~90-110 pastas, inglês
│   ├── Alien/
│   ├── Brindlewood-Bay/
│   ├── Cairn/
│   ├── Call Of Cthulhu - 7th Edition/
│   ├── Cyberpunk Red/
│   ├── Forbidden Lands/
│   ├── Ironsworn/
│   ├── Mausritter/
│   ├── Wanderhome/
│   └── ...                         ← PDFs diretamente na pasta (padrão flat)
│
├── PT/                             ← ~101 pastas, português
│   ├── Blades in the Dark/
│   │   ├── Scum & Villainy/        ← sub-pasta por jogo derivado
│   │   └── Band of Blades/
│   ├── OLD DRAGON 2/
│   ├── Ordem Paranormal/
│   │   ├── Aventuras Prontas/      ← sub-pasta por tipo de conteúdo
│   │   ├── Fichas/
│   │   └── Livros e Suplementos/
│   ├── Vampiro v5/                 ← flat
│   └── ...
│
├── MY_RPG/                         ← homebrew pessoal
├── Revistas/                       ← zines e magazines
└── Old School/                     ← OSR
```

**Padrões de nesting:** ~80% flat (PDFs direto), ~10% sub-pastas por tipo, ~10% sub-pastas por jogo derivado. O scanner deve ser recursivo.

**Convenções de nomes irregulares:** Title Case dominante, mas existe `.dungeon`, `CBR+PNK`, `shadowrun` (lower), `OLD DRAGON 2` (upper), `Nômades` (acento). O indexador deve ser tolerante.

**Escopo de indexação:**

| Pasta | Indexar | Extra tags |
|---|---|---|
| `EN/` | Sim | — |
| `PT/` | Sim | — |
| `MY_RPG/` | Sim | `homebrew` |
| `Revistas/` | Sim | `magazine`, `zine` |
| `Old School/` | Sim (dedup por hash) | `OSR` |
| `Resumos/`, `Docs/`, `Músicas/`, `zona/`, `test/` | Não | — |

---

## 4. Repositório

Repo **público** no GitHub: `sergiojs/rpg-catalog`

```
rpg-catalog/
├── indexer/
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # parsing config.yaml + env vars
│   │   ├── scanner.py           # scan de diretórios + hashing
│   │   ├── pdf_extractor.py     # metadados + thumbnail + texto
│   │   ├── llm/
│   │   │   ├── __init__.py
│   │   │   ├── base.py          # ABC LLMProvider
│   │   │   ├── anthropic.py     # Claude
│   │   │   ├── google.py        # Gemini
│   │   │   ├── openrouter.py    # OpenRouter
│   │   │   └── router.py        # seleção + fallback
│   │   ├── enrichment.py        # orquestra LLM: tags, resumo
│   │   ├── database.py          # SQLite CRUD + queries de catálogo
│   │   ├── indexing.py          # pipeline orquestrador
│   │   ├── models.py            # dataclasses + Pydantic schemas
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── catalog.py       # GET /api/books, /api/books/:hash, /api/facets, /api/stats
│   │       └── indexing.py      # POST /api/index, GET /api/index/status
│   ├── tests/
│   │   ├── conftest.py          # fixtures: PDFs fake, DB in-memory, sample tree
│   │   ├── fixtures/
│   │   │   ├── sample_tree/     # árvore simulando /data/rpg
│   │   │   │   ├── EN/Mausritter/mausritter-core.pdf
│   │   │   │   ├── EN/Cairn/cairn-2e.pdf
│   │   │   │   ├── PT/OLD DRAGON 2/od2-basico.pdf
│   │   │   │   └── PT/Ordem Paranormal/Livros e Suplementos/op-core.pdf
│   │   │   └── config_test.yaml
│   │   ├── test_config.py
│   │   ├── test_scanner.py
│   │   ├── test_pdf_extractor.py
│   │   ├── test_database.py
│   │   ├── test_enrichment.py
│   │   ├── test_llm_router.py
│   │   ├── test_llm_openrouter.py
│   │   ├── test_api_catalog.py      # testes dos endpoints de catálogo
│   │   ├── test_api_indexing.py     # testes dos endpoints de indexação
│   │   └── test_integration.py
│   ├── config.yaml
│   ├── Dockerfile
│   └── pyproject.toml
├── catalog-site/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── api/
│   │   │   └── client.js            # wrapper fetch para /api/*
│   │   ├── components/
│   │   │   ├── BookCard.jsx
│   │   │   ├── BookGrid.jsx
│   │   │   ├── BookModal.jsx
│   │   │   ├── FilterSidebar.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── IndexingPanel.jsx
│   │   │   ├── SyncInfo.jsx
│   │   │   └── StatsBar.jsx
│   │   ├── hooks/
│   │   │   ├── useBooks.js           # GET /api/books com params
│   │   │   ├── useFacets.js          # GET /api/facets
│   │   │   ├── useFilters.js         # estado local dos filtros → query params
│   │   │   ├── useSearch.js          # debounce + query param q=
│   │   │   └── useIndexer.js         # POST /api/index + polling status
│   │   ├── utils/
│   │   │   └── formatters.js
│   │   └── styles/
│   │       └── index.css
│   ├── tests/
│   │   ├── hooks/
│   │   │   ├── useBooks.test.js
│   │   │   ├── useFacets.test.js
│   │   │   ├── useFilters.test.js
│   │   │   ├── useSearch.test.js
│   │   │   └── useIndexer.test.js
│   │   ├── components/
│   │   │   ├── BookCard.test.jsx
│   │   │   ├── BookGrid.test.jsx
│   │   │   ├── FilterSidebar.test.jsx
│   │   │   ├── SearchBar.test.jsx
│   │   │   ├── IndexingPanel.test.jsx
│   │   │   └── SyncInfo.test.jsx
│   │   └── fixtures/
│   │       ├── books_response.json
│   │       └── facets_response.json
│   ├── index.html
│   ├── nginx.conf
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── vitest.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docker-compose.yml
├── .env.example
├── .github/
│   └── workflows/
│       ├── test-indexer.yml
│       ├── test-site.yml
│       └── build-images.yml
├── docs/
│   ├── ARCHITECTURE.md
│   └── FOLDER_STRUCTURE.md
├── .gitignore
├── LICENSE
└── README.md
```

---

## 5. API — Endpoints Completos

### 5.1 Catalog API (leitura do SQLite)

```
GET /api/books
  Query params:
    page        int     (default 1)
    per_page    int     (default 24, max 100)
    q           string  (busca full-text: título, resumo, tags, filename)
    language    string  (filtro: "en", "pt")
    system      string  (filtro, aceita múltiplos: ?system=OSR&system=PbtA)
    category    string  (filtro, aceita múltiplos)
    genre       string  (filtro, aceita múltiplos)
    tag         string  (filtro por custom_tags, aceita múltiplos)
    folder      string  (filtro por parent_folder)
    sort        string  (default "title_asc"; opções: title_asc, title_desc,
                         pages_asc, pages_desc, size_asc, size_desc,
                         indexed_at_desc)

  Response 200:
    {
      "items": [
        {
          "file_hash": "a1b2c3...",
          "title": "Mausritter - Rules & Setting",
          "filename": "mausritter-core.pdf",
          "parent_folder": "Mausritter",
          "language": "en",
          "file_size": 15728640,
          "file_size_human": "15.0 MB",
          "page_count": 48,
          "thumbnail_url": "/thumbnails/a1b2c3.webp",
          "summary": "A rules-light RPG where you play mice adventurers...",
          "system_tags": ["Mausritter", "OSR"],
          "category_tags": ["Core Rulebook"],
          "genre_tags": ["Fantasy"],
          "custom_tags": ["rules-light", "hexcrawl", "mice"],
          "llm_confidence": 0.92,
          "indexed_at": "2026-03-25T14:30:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "per_page": 24,
        "total_items": 347,
        "total_pages": 15
      }
    }

GET /api/books/{file_hash}
  Response 200:
    {
      "file_hash": "a1b2c3...",
      "title": "Mausritter - Rules & Setting",
      "filename": "mausritter-core.pdf",
      "relative_path": "EN/Mausritter/mausritter-core.pdf",
      "parent_folder": "Mausritter",
      "language": "en",
      "file_size": 15728640,
      "file_size_human": "15.0 MB",
      "page_count": 48,
      "thumbnail_url": "/thumbnails/a1b2c3.webp",
      "summary": "A rules-light RPG where you play mice adventurers...",
      "system_tags": ["Mausritter", "OSR"],
      "category_tags": ["Core Rulebook"],
      "genre_tags": ["Fantasy"],
      "custom_tags": ["rules-light", "hexcrawl", "mice"],
      "llm_provider": "openrouter-tags",
      "llm_confidence": 0.92,
      "indexed_at": "2026-03-25T14:30:00Z",
      "updated_at": "2026-03-25T14:30:00Z"
    }
  Response 404: { "detail": "Book not found" }

GET /api/facets
  Response 200:
    {
      "languages": [
        { "value": "en", "label": "English", "count": 230 },
        { "value": "pt", "label": "Português", "count": 117 }
      ],
      "systems": [
        { "value": "D&D 5e", "count": 42 },
        { "value": "PbtA", "count": 28 },
        { "value": "OSR", "count": 25 },
        ...
      ],
      "categories": [
        { "value": "Core Rulebook", "count": 85 },
        { "value": "Supplement", "count": 72 },
        ...
      ],
      "genres": [
        { "value": "Fantasy", "count": 180 },
        { "value": "Horror", "count": 45 },
        ...
      ],
      "folders": [
        { "value": "Mausritter", "count": 3 },
        { "value": "OLD DRAGON 2", "count": 8 },
        ...
      ]
    }

  Nota: os contadores do /api/facets refletem SEMPRE o catálogo total.
  O frontend pode opcionalmente pedir facets filtrados:
    GET /api/facets?language=pt  → contadores só dos livros em PT.

GET /api/stats
  Response 200:
    {
      "total_books": 347,
      "total_size_bytes": 15032385536,
      "total_size_human": "14.0 GB",
      "total_pages": 28450,
      "by_language": { "en": 230, "pt": 117 },
      "by_system_top10": [ ... ],
      "by_category": [ ... ],
      "oldest_indexed": "2026-03-01T10:00:00Z",
      "newest_indexed": "2026-03-25T14:30:00Z"
    }
```

### 5.2 Indexing API

```
POST /api/index
  Body (opcional):
    {
      "force_reindex": false,
      "folders": ["EN", "PT"],
      "dry_run": false
    }
  Response 202:
    {
      "job_id": "idx-20260326-143000",
      "status": "started",
      "message": "Indexing started for EN, PT"
    }
  Response 409:
    {
      "status": "busy",
      "current_job": "idx-20260326-140000",
      "progress": { ... }
    }

GET /api/index/status
  Response 200:
    {
      "status": "indexing" | "idle" | "error",
      "current_job": "idx-20260326-143000" | null,
      "progress": {
        "phase": "scanning" | "extracting" | "enriching",
        "total_files": 347,
        "processed": 123,
        "new_files": 15,
        "skipped": 108,
        "errors": 2,
        "current_file": "EN/Mausritter/mausritter-core.pdf",
        "elapsed_seconds": 45
      },
      "last_run": {
        "job_id": "idx-20260325-100000",
        "finished_at": "2026-03-25T10:05:32Z",
        "status": "completed",
        "total_indexed": 347,
        "new_indexed": 5,
        "errors": 0,
        "duration_seconds": 332
      },
      "errors_log": [
        {
          "file": "PT/D&D/corrupted.pdf",
          "error": "Failed to open PDF: file is encrypted",
          "timestamp": "2026-03-25T10:03:12Z"
        }
      ]
    }

GET /api/health
  Response 200: { "status": "ok" }
```

### 5.3 Busca Full-Text no SQLite

Para o parâmetro `q` no `GET /api/books`, usar **FTS5** do SQLite:

```sql
-- Tabela virtual FTS5 (criada junto com o schema)
CREATE VIRTUAL TABLE books_fts USING fts5(
    file_hash UNINDEXED,
    title,
    filename,
    parent_folder,
    summary,
    system_tags,
    category_tags,
    genre_tags,
    custom_tags,
    tokenize='unicode61 remove_diacritics 2'
);

-- Sync: após insert/update em books, sync para books_fts
INSERT INTO books_fts(file_hash, title, filename, parent_folder, summary,
    system_tags, category_tags, genre_tags, custom_tags)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Query com ranking
SELECT b.*
FROM books b
JOIN books_fts fts ON b.file_hash = fts.file_hash
WHERE books_fts MATCH ?
ORDER BY bm25(books_fts)
LIMIT ? OFFSET ?;
```

O `tokenize='unicode61 remove_diacritics 2'` garante que buscas como "dragao" encontrem "Dragão" e "nomades" encontre "Nômades".

---

## 6. Componente 1 — Indexador + API

### 6.1 Configuração (`config.yaml`)

```yaml
sources:
  - path: "EN"
    language: "en"
    recursive: true
  - path: "PT"
    language: "pt"
    recursive: true
  - path: "MY_RPG"
    language: "pt"
    recursive: true
    extra_tags: ["homebrew"]
  - path: "Revistas"
    language: "pt"
    recursive: true
    extra_tags: ["magazine", "zine"]
  - path: "Old School"
    language: "pt"
    recursive: true
    extra_tags: ["OSR"]

file_extensions: [".pdf"]

rpg_base_path: "/data/rpg"
database_path: "/data/db/catalog.db"
thumbnails_dir: "/data/thumbnails"

thumbnail:
  width: 300
  height: 420
  format: "webp"
  quality: 80

indexing:
  min_file_size: 10240
  max_llm_file_size: 104857600
  llm_sample_pages: 5
  batch_size: 20

llm:
  enabled: true
  timeout: 120
  providers:
    - name: "openrouter-tags"
      type: "openrouter"
      model: "meta-llama/llama-3.1-70b-instruct"
      tasks: ["tags", "system_detect"]
      env_key: "OPENROUTER_API_KEY"

    - name: "claude-summary"
      type: "anthropic"
      model: "claude-sonnet-4-20250514"
      tasks: ["summary"]
      env_key: "ANTHROPIC_API_KEY"

    - name: "gemini-fallback"
      type: "google"
      model: "gemini-2.0-flash"
      tasks: ["tags", "summary", "system_detect"]
      env_key: "GOOGLE_API_KEY"

    - name: "openrouter-fallback"
      type: "openrouter"
      model: "google/gemini-flash-1.5"
      tasks: ["tags", "summary"]
      env_key: "OPENROUTER_API_KEY"

tag_taxonomy:
  systems:
    - "D&D 5e"
    - "D&D 3.5"
    - "Pathfinder 2e"
    - "Old Dragon 2e"
    - "Mausritter"
    - "Mörk Borg"
    - "Blades in the Dark"
    - "Forged in the Dark"
    - "PbtA"
    - "OSR"
    - "Savage Worlds"
    - "Call of Cthulhu"
    - "GURPS"
    - "Fate"
    - "Cypher System"
    - "Year Zero Engine"
    - "Cortex Prime"
    - "Ironsworn/Starforged"
    - "DCC"
    - "Ordem Paranormal"
    - "System Agnostic"
    - "Other"
  categories:
    - "Core Rulebook"
    - "Supplement"
    - "Adventure/Module"
    - "Setting/Worldbook"
    - "Bestiary"
    - "Solo RPG"
    - "Zine/Pamphlet"
    - "Map Pack"
    - "GM Tools"
    - "Quick Start"
    - "SRD"
    - "Magazine"
    - "Character Sheet"
    - "Homebrew"
    - "Other"
  genres:
    - "Fantasy"
    - "Sci-Fi"
    - "Horror"
    - "Post-Apocalyptic"
    - "Cyberpunk"
    - "Steampunk"
    - "Historical"
    - "Modern"
    - "Weird/Experimental"
    - "Kids/Family"
    - "Superhero"
    - "Other"
```

### 6.2 Schema SQLite (atualizado com FTS5)

```sql
CREATE TABLE books (
    file_hash       TEXT PRIMARY KEY,
    file_path       TEXT NOT NULL,
    relative_path   TEXT NOT NULL,
    filename        TEXT NOT NULL,
    parent_folder   TEXT NOT NULL,
    title           TEXT NOT NULL,
    language        TEXT DEFAULT 'en',
    file_size       INTEGER DEFAULT 0,
    page_count      INTEGER DEFAULT 0,
    thumbnail_file  TEXT,
    summary         TEXT,
    system_tags     TEXT,              -- JSON array
    category_tags   TEXT,              -- JSON array
    genre_tags      TEXT,              -- JSON array
    custom_tags     TEXT,              -- JSON array
    llm_provider    TEXT,
    llm_confidence  REAL,
    indexed_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE INDEX idx_books_language ON books(language);
CREATE INDEX idx_books_parent ON books(parent_folder);

-- Full-text search (busca sem diacríticos)
CREATE VIRTUAL TABLE books_fts USING fts5(
    file_hash UNINDEXED,
    title,
    filename,
    parent_folder,
    summary,
    system_tags,
    category_tags,
    genre_tags,
    custom_tags,
    tokenize='unicode61 remove_diacritics 2'
);

CREATE TABLE scan_log (
    file_path       TEXT PRIMARY KEY,
    file_hash       TEXT NOT NULL,
    file_mtime      REAL,
    file_size       INTEGER,
    last_scanned_at TEXT NOT NULL
);

CREATE TABLE index_runs (
    job_id          TEXT PRIMARY KEY,
    started_at      TEXT NOT NULL,
    finished_at     TEXT,
    status          TEXT NOT NULL,     -- running, completed, failed
    total_files     INTEGER DEFAULT 0,
    new_indexed     INTEGER DEFAULT 0,
    skipped         INTEGER DEFAULT 0,
    errors          INTEGER DEFAULT 0,
    error_log       TEXT               -- JSON array
);
```

### 6.3 `database.py` — Queries de Catálogo

O módulo `database.py` concentra tanto o CRUD de indexação quanto as queries de leitura do catálogo:

```python
# Queries principais que database.py deve expor:

def list_books(
    page: int,
    per_page: int,
    q: str | None,           # FTS5 MATCH
    language: str | None,
    systems: list[str],
    categories: list[str],
    genres: list[str],
    tags: list[str],
    folder: str | None,
    sort: str,
) -> tuple[list[BookRecord], int]:
    """Retorna (items, total_count) para paginação."""

def get_book(file_hash: str) -> BookRecord | None:
    """Busca livro por hash."""

def get_facets(language: str | None = None) -> dict:
    """Contadores agrupados por sistema, categoria, gênero, idioma, folder."""

def get_stats() -> dict:
    """Totais globais do catálogo."""

def sync_fts(file_hash: str, book: BookRecord):
    """Insere/atualiza registro na tabela FTS5 após indexação."""
```

### 6.4 Estratégia Multi-LLM

Sem LLM local — tudo via API remota.

| Tarefa | Provider primário | Fallback | Motivo |
|---|---|---|---|
| **Tags / Sistema RPG** | OpenRouter (Llama 3.1 70B) | Gemini Flash | Classificação simples, barato |
| **Resumo do livro** | Claude Sonnet | OpenRouter (Gemini via OR) | Melhor qualidade de texto |
| **Validação cruzada** | Gemini Flash | — | Confirmar tags de baixa confiança |

**Prompt template (tagging):**

```
You are classifying an RPG book for a personal catalog.
Given the text from the first pages, return ONLY valid JSON:

{
  "title": "best guess at the book title",
  "system": "one of: {systems_list}",
  "category": "one of: {categories_list}",
  "genre": "one of: {genres_list}",
  "extra_tags": ["up to 5 freeform tags"],
  "confidence": 0.0 to 1.0
}

Text:
---
{extracted_text}
---
```

**Prompt template (resumo):**

```
Write a 2-3 sentence summary of this RPG book in {language}.
Be specific: setting, mechanics, theme.
Only describe what's evident from the text.

Text from first pages:
---
{extracted_text}
---
```

### 6.5 Reindexação Incremental

```
Para cada arquivo no scan:
  1. fingerprint = f"{file_size}:{file_mtime}"
  2. Busca em scan_log:
     - Não existe                    → novo     → indexar + sync FTS
     - Existe, fingerprint diferente → alterado  → reindexar + sync FTS
     - Existe, fingerprint igual     → pular
  3. Arquivos em scan_log mas não no disco → remover do DB + FTS
  4. Dedup cross-folder por file_hash
```

### 6.6 Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libmupdf-dev curl && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY src/ src/
COPY config.yaml .

EXPOSE 8484

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8484/api/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8484"]
```

### 6.7 Dependências (`pyproject.toml`)

```toml
[project]
name = "rpg-catalog-indexer"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.32",
    "PyMuPDF>=1.24",
    "Pillow>=10.0",
    "PyYAML>=6.0",
    "httpx>=0.27",
    "anthropic>=0.40",
    "google-generativeai>=0.8",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-cov>=5.0",
    "pytest-asyncio>=0.24",
    "httpx[test]",
    "respx>=0.21",
    "reportlab>=4.0",
]
```

---

## 7. Componente 2 — Catálogo Web

### 7.1 Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | React + Vite | SPA estática, zero server |
| HTTP | fetch nativo + wrapper | Sem axios; leve |
| Estilo | Tailwind CSS | Tema claro, responsivo |
| Testes | Vitest + RTL + MSW | Rápido, mock de API |
| Ícones | Lucide React | Leve |

### 7.2 Fluxo de dados no frontend

```
┌─────────────────────────────────────────────────┐
│ App.jsx                                          │
│                                                  │
│  useFilters() → { language, systems, ... }       │
│       │                                          │
│       ├── useBooks(filters, page, q)             │
│       │     GET /api/books?language=pt&page=1    │
│       │     → { items, pagination }              │
│       │                                          │
│       ├── useFacets(filters.language)             │
│       │     GET /api/facets?language=pt           │
│       │     → { systems[], categories[], ... }   │
│       │                                          │
│       └── useSearch()                             │
│             debounce → atualiza q nos params      │
│                                                  │
│  useIndexer()                                    │
│       POST /api/index                            │
│       GET /api/index/status (polling 2s)         │
└─────────────────────────────────────────────────┘
```

O frontend **não carrega todos os livros**. Cada interação (filtro, página, busca) faz uma nova request à API com os parâmetros atualizados. Isso escala para qualquer tamanho de catálogo.

### 7.3 Features

**Grid principal:**
- Cards responsivos (4 col desktop, 2 tablet, 1 mobile)
- Thumbnail, título, badges (sistema, categoria, idioma)
- Nº de páginas, tamanho do arquivo

**Filtros (sidebar colapsável):**
- Sistema (multiselect com contadores do `/api/facets`)
- Categoria (multiselect)
- Gênero (multiselect)
- Idioma (EN / PT toggle)
- Pasta de origem (dropdown)
- Contadores atualizam em tempo real

**Busca:** Input com debounce 300ms → param `q=` → FTS5 server-side.

**Paginação:** 24 items/página, navegação numérica + prev/next.

**Modal de detalhes:** Resumo, todas as tags, path relativo, parent_folder, confidence.

**Painel de indexação (`IndexingPanel`):**
- Botão "Reindexar" → `POST /api/index`
- Progress bar (polling `GET /api/index/status` a cada 2s)
- Fase atual, contadores, arquivo em processamento
- Log de erros inline

**Info de sincronização (`SyncInfo`):**
- Última indexação: data, duração, novos livros
- Log de erros colapsável
- Stats do catálogo (total, por idioma)

### 7.4 Estética — Tema Claro

- **Fundo:** Branco quente (#fafaf8), textura sutil
- **Cards:** Branco (#ffffff), sombra suave, border-radius 12px
- **Cor primária:** Verde profundo (#2d5016)
- **Cor accent:** Âmbar (#c5913e)
- **Texto:** Cinza escuro (#1a1a1a) corpo, (#6b7280) secundário
- **Fonte display:** Cinzel ou Cormorant Garamond
- **Fonte body:** Source Sans 3 ou Nunito
- **Hover:** Sombra elevada + borda accent
- **Badges:** Pill com cores semânticas por sistema
- **Mobile-first:** Sidebar → drawer, cards em coluna

### 7.5 Dockerfile

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 7.6 nginx.conf

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API → indexer container
    location /api/ {
        proxy_pass http://rpg-indexer:8484;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Thumbnails do volume compartilhado
    location /thumbnails/ {
        alias /data/thumbnails/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 8. Docker Compose

```yaml
services:
  rpg-indexer:
    build: ./indexer
    # Ou usar imagem do GHCR:
    # image: ghcr.io/sergiojs/rpg-catalog/indexer:latest
    container_name: rpg-indexer
    restart: unless-stopped
    ports:
      - "8484:8484"
    volumes:
      - ${RPG_DATA_PATH:-/data/rpg}:/data/rpg:ro
      - thumbnails:/data/thumbnails
      - indexer-db:/data/db
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8484/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  rpg-catalog:
    build: ./catalog-site
    # Ou usar imagem do GHCR:
    # image: ghcr.io/sergiojs/rpg-catalog/catalog:latest
    container_name: rpg-catalog
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - thumbnails:/data/thumbnails:ro
    depends_on:
      rpg-indexer:
        condition: service_healthy

volumes:
  thumbnails:
  indexer-db:
```

### `.env.example`

```bash
# Path dos PDFs no host
RPG_DATA_PATH=/data/rpg

# LLM API Keys (preencha pelo menos uma)
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=
GOOGLE_API_KEY=
```

---

## 9. Estratégia de Testes (TDD-First)

### 9.1 Plano de Testes — Indexador + API

| Módulo | Testes unitários | Mocks |
|---|---|---|
| `models.py` | Criação, serialização, Pydantic validation | — |
| `config.py` | Parse válido, defaults, inválido, env override | Filesystem |
| `scanner.py` | Recursivo 3 níveis, filtra extensão, ignora < min, hash, novos/alterados/removidos, parent_folder | `tmp_path` com fixtures |
| `pdf_extractor.py` | Título, pages, size, thumbnail, texto, scanned fallback | PDFs reportlab |
| `database.py` | Schema, insert, upsert, query, scan_log, index_runs, **list_books com filtros**, **list_books com FTS**, **get_facets**, **get_stats**, **sync_fts** | SQLite in-memory |
| `llm/base.py` | Contrato ABC | — |
| `llm/openrouter.py` | Headers, model routing, parse, fallback | `respx` |
| `llm/anthropic.py` | Request, parse, retry 429, timeout | `respx` |
| `llm/google.py` | Request, parse | Mock SDK |
| `llm/router.py` | Seleção por task, fallback cascata, skip sem key | Mock providers |
| `enrichment.py` | Prompt build, parse JSON, JSON malformado, merge tags, confidence | Mock LLM |
| `routes/catalog.py` | **GET /api/books**: paginação, filtros, busca FTS, sort; **GET /api/books/:hash**: found e 404; **GET /api/facets**: contadores corretos, filtro por language; **GET /api/stats**: totais | TestClient + DB fixture |
| `routes/indexing.py` | POST 202, POST 409 busy, GET status idle/indexing/error | Background task mock |
| `indexing.py` | Pipeline completo: scan → extract → DB → FTS sync | Mock LLM + fixture tree |

**Testes de `routes/catalog.py` em detalhe:**

```python
# test_api_catalog.py — exemplos de cenários

def test_list_books_default_pagination(client, seeded_db):
    """GET /api/books retorna 24 items, page 1."""

def test_list_books_filter_language(client, seeded_db):
    """GET /api/books?language=pt retorna só livros PT."""

def test_list_books_filter_multiple_systems(client, seeded_db):
    """GET /api/books?system=OSR&system=PbtA retorna ambos."""

def test_list_books_search_fts(client, seeded_db):
    """GET /api/books?q=mausritter encontra pelo título."""

def test_list_books_search_fts_no_diacritics(client, seeded_db):
    """GET /api/books?q=dragao encontra 'Dragão'."""

def test_list_books_sort_pages_desc(client, seeded_db):
    """GET /api/books?sort=pages_desc ordena corretamente."""

def test_list_books_empty_result(client, seeded_db):
    """GET /api/books?system=GURPS retorna items=[], total=0."""

def test_get_book_found(client, seeded_db):
    """GET /api/books/{hash} retorna livro completo."""

def test_get_book_not_found(client, seeded_db):
    """GET /api/books/{bad_hash} retorna 404."""

def test_facets_all(client, seeded_db):
    """GET /api/facets retorna contadores corretos."""

def test_facets_filtered_by_language(client, seeded_db):
    """GET /api/facets?language=en retorna só contadores EN."""

def test_stats(client, seeded_db):
    """GET /api/stats retorna totais corretos."""
```

### 9.2 Plano de Testes — Catálogo Web

| Módulo | Testes |
|---|---|
| `api/client.js` | Constrói URL com params corretos, trata erros HTTP |
| `useBooks` | Fetch com params, loading, error, re-fetch ao mudar filtros |
| `useFacets` | Fetch, re-fetch ao mudar language, contadores |
| `useFilters` | Alterna filtro, combina múltiplos, reset, serializa para query params |
| `useSearch` | Debounce 300ms, atualiza param q, clear |
| `useIndexer` | POST, polling, estados (idle/indexing/error), stop ao idle |
| `BookCard` | Renderiza thumbnail, badges, título; click abre modal |
| `BookGrid` | Grid, paginação, empty state, loading skeleton |
| `FilterSidebar` | Multiselect, contadores, drawer no mobile |
| `SearchBar` | Input, debounce, clear |
| `IndexingPanel` | Botão, progress bar, disabled quando busy, mostra erros |
| `SyncInfo` | Última sync, log colapsável, stats |
| `Pagination` | Navegação, prev/next disabled, page atual highlighted |

**Stack:** Vitest + React Testing Library + MSW.

### 9.3 GitHub Actions CI

```yaml
# .github/workflows/test-indexer.yml
name: Test Indexer
on:
  push:
    paths: ['indexer/**']
  pull_request:
    paths: ['indexer/**']
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -e ".[dev]"
        working-directory: indexer
      - run: pytest --cov=src --cov-report=term-missing -v
        working-directory: indexer
```

```yaml
# .github/workflows/test-site.yml
name: Test Site
on:
  push:
    paths: ['catalog-site/**']
  pull_request:
    paths: ['catalog-site/**']
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: catalog-site
      - run: npm test -- --run
        working-directory: catalog-site
```

```yaml
# .github/workflows/build-images.yml
name: Build & Push Docker Images
on:
  push:
    branches: [main]
    tags: ['v*']
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: ./indexer
          push: true
          tags: ghcr.io/${{ github.repository }}/indexer:latest
      - uses: docker/build-push-action@v6
        with:
          context: ./catalog-site
          push: true
          tags: ghcr.io/${{ github.repository }}/catalog:latest
```

---

## 10. Fases de Implementação

### Fase 0 — Setup Repo + CI (1-2h)
- [ ] Criar repo público no GitHub
- [ ] Estrutura de diretórios completa
- [ ] `pyproject.toml` com deps de dev
- [ ] `package.json` com Vitest
- [ ] GitHub Actions CI
- [ ] `.env.example`, `.gitignore`, `README.md`, `LICENSE`
- [ ] Verificar CI verde

### Fase 1 — Indexador Core + API de Catálogo, TDD (12-16h)

Ordem de implementação (testes primeiro sempre):

1. **`models.py`** — BookRecord, ScanEntry, IndexRun, API schemas Pydantic
2. **`config.py`** — parse YAML, env vars, validação
3. **`scanner.py`** — scan recursivo, hash, fingerprint, parent_folder
4. **`pdf_extractor.py`** — metadados, thumbnail, texto
5. **`database.py`** — CRUD + FTS5 + **queries de catálogo** (list_books, get_facets, get_stats)
6. **`routes/catalog.py`** — **GET /api/books, /api/books/:hash, /api/facets, /api/stats**
7. **`routes/indexing.py`** — POST /api/index, GET /api/index/status, /api/health
8. **`indexing.py`** — pipeline orquestrador (scan → extract → DB → FTS sync)
9. **Teste de integração** — pipeline completo sem LLM
10. **Dockerfile + healthcheck**

### Fase 2 — Enriquecimento LLM, TDD (6-8h)

1. `llm/base.py` + contrato
2. `llm/openrouter.py` + testes respx
3. `llm/anthropic.py` + testes respx
4. `llm/google.py` + testes mock
5. `llm/router.py` + seleção e fallback
6. `enrichment.py` + prompt, parse, merge
7. Integrar no pipeline

### Fase 3 — Catálogo Web, TDD (10-12h)

1. Setup: Vite + Tailwind + Vitest + MSW
2. `api/client.js` + testes
3. Hooks (testes primeiro): useBooks, useFacets, useFilters, useSearch, useIndexer
4. Componentes (testes primeiro): BookCard, BookGrid, FilterSidebar, SearchBar, Pagination, IndexingPanel, SyncInfo, BookModal
5. Layout + tema claro + responsivo

### Fase 4 — Docker Compose + Deploy (3-4h)
- [ ] `docker-compose.yml` completo
- [ ] Build images action (GHCR)
- [ ] Testar `docker compose up` localmente
- [ ] Deploy no ZimaOS
- [ ] Fluxo completo: up → indexar via UI → navegar catálogo
- [ ] README com install + screenshots

### Fase 5 — Polish + Extras (4-6h)
- [ ] Edge cases: PDFs corrompidos, nomes especiais, FTS edge cases
- [ ] Skeleton loading
- [ ] Animações
- [ ] Responsividade refinada
- [ ] (Opcional) Dark mode toggle
- [ ] (Opcional) Export CSV

---

## 11. Decisões em Aberto

| Questão | Opções | Recomendação |
|---|---|---|
| Modelo OpenRouter para tags | Llama 3.1 70B, Mistral Large, Qwen 72B | Llama 70B — melhor custo |
| Polling vs SSE para indexação | Polling 2s, SSE | Polling — mais simples |
| Thumbnail fallback | SVG placeholder, ícone genérico | SVG com ícone de livro + parent_folder |
| Imagens Docker | Build local, GHCR | GHCR — pull mais rápido no ZimaOS |
| FTS vs LIKE para busca | FTS5, LIKE com wildcards | FTS5 — ranking BM25, diacríticos |
| Facets: totais fixos ou filtrados | Sempre total, ou refletem filtros ativos | Facets refletem language filter, demais mostram total |

---

## 12. Estimativa de Esforço

| Fase | Esforço |
|---|---|
| Fase 0 — Setup repo + CI | 1-2h |
| Fase 1 — Indexador + API catálogo (TDD) | 12-16h |
| Fase 2 — LLM enrichment (TDD) | 6-8h |
| Fase 3 — Catálogo web (TDD) | 10-12h |
| Fase 4 — Docker Compose + deploy | 3-4h |
| Fase 5 — Polish + extras | 4-6h |
| **Total** | **~36-48h** |
