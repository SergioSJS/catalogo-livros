# RPG Catalog

Catálogo pessoal de livros de RPG em PDF com indexação automática e enriquecimento via LLM.

## Arquitetura

```
┌──────────────────────────────────────────────────┐
│                Docker Compose                     │
│                                                   │
│  rpg-indexer (FastAPI)  ←→  rpg-catalog (nginx)  │
│  :8564                       :8160                │
└──────────────────────────────────────────────────┘
```

- **rpg-indexer** — varre pastas de PDFs, extrai metadados, gera thumbnails, enriquece com LLM (Claude/Gemini/OpenRouter). Serve a API REST do catálogo via SQLite.
- **rpg-catalog** — SPA React que consome a API: busca, filtros, paginação, painel de indexação.

## Requisitos

- Docker + Docker Compose v2
- API keys de pelo menos um LLM (Anthropic, Google ou OpenRouter)

## Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/sergiojs/rpg-catalog
cd rpg-catalog

# 2. Configure o .env
cp .env.example .env
# Edite .env: defina RPG_DATA_PATH e as API keys

# 3. Suba os containers
docker compose up -d

# 4. Acesse
open http://localhost:8160
```

## Configuração (.env)

| Variável | Descrição | Exemplo |
|---|---|---|
| `RPG_DATA_PATH` | Caminho local dos PDFs | `/home/user/rpg-books` |
| `ANTHROPIC_API_KEY` | Claude (resumos) | `sk-ant-...` |
| `OPENROUTER_API_KEY` | OpenRouter/Llama (tags) | `sk-or-...` |
| `GOOGLE_API_KEY` | Gemini (fallback) | `AIza...` |

## Uso

1. Abra `http://localhost:8160`
2. Clique em **Reindexar** para iniciar a indexação dos PDFs
3. Aguarde o progresso (pode levar alguns minutos para coleções grandes)
4. Navegue, filtre e busque pelo catálogo

## API

```
GET  /api/books          # lista paginada com filtros
GET  /api/books/:hash    # detalhe de um livro
GET  /api/facets         # contadores por sistema/categoria/gênero
GET  /api/stats          # totais do catálogo
POST /api/index          # inicia reindexação
GET  /api/index/status   # progresso da indexação
GET  /api/health         # health check
```

## Desenvolvimento

```bash
# Indexer (Python — requer uv)
cd indexer
uv sync --extra dev
uv run pytest --cov=src -v

# Catalog site (Node)
cd catalog-site
npm install
npm test
npm run dev
```
