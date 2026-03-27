FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instala uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Copia dependências primeiro (cache de layer)
COPY pyproject.toml .
RUN uv sync --no-dev --no-install-project

# Copia código-fonte
COPY src/ src/
COPY config.yaml .

# Instala o projeto
RUN uv sync --no-dev

EXPOSE 8564

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8564/api/health || exit 1

CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8564"]
