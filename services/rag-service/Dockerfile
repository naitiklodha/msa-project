FROM python:3.11-slim

WORKDIR /app

COPY services/rag-service/pyproject.toml services/rag-service/uv.lock* ./
RUN pip install uv && uv sync --frozen || uv sync

COPY services/rag-service/ .

EXPOSE 3005

CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3005"]