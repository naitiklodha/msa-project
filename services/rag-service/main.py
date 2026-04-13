import json
import os
from contextlib import asynccontextmanager
from typing import Any

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# 1. Import the new Google GenAI SDK
from google import genai
from google.genai import types

load_dotenv()
POSTGRES_URL = os.getenv("POSTGRES_URL")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
EMBEDDING_MODEL = "models/embedding-001"
LLM_MODEL = os.getenv("GEMINI_LLM_MODEL", "gemini-3.0-flash-preview")
VECTOR_DIM = int(os.getenv("EMBEDDING_DIM", "768"))

if not POSTGRES_URL:
    raise RuntimeError("POSTGRES_URL is required.")

if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is required.")

# 2. Initialize the new Client instead of genai.configure()
client = genai.Client(api_key=GOOGLE_API_KEY)

# 3. Replace @app.on_event("startup") with a lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_db()
    yield  # The app runs while yielding

# Pass the lifespan to the FastAPI app instance
app = FastAPI(title="RAG Service", version="1.0.0", lifespan=lifespan)


class IngestRequest(BaseModel):
    source: str | None = None
    content: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class UpdateIngestRequest(BaseModel):
    source: str | None = None
    content: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class QueryRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)


def _to_pgvector(vector: list[float]) -> str:
    return "[" + ",".join(str(x) for x in vector) + "]"


def _embed_text(text: str) -> list[float]:
    # 4. Update embedding syntax for the new SDK
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
    )
    return result.embeddings[0].values


def _embed_query(text: str) -> list[float]:
    # 4. Update embedding syntax for the new SDK
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
    )
    return result.embeddings[0].values


def _get_connection() -> psycopg.Connection:
    return psycopg.connect(POSTGRES_URL)


def _init_db() -> None:
    create_sql = f"""
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS rag_documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      source TEXT,
      content TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{{}}'::jsonb,
      embedding VECTOR({VECTOR_DIM}) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding
      ON rag_documents USING ivfflat (embedding vector_cosine_ops);
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(create_sql)
        conn.commit()


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest")
def ingest_data(payload: IngestRequest) -> dict[str, Any]:
    embedding = _embed_text(payload.content)
    if len(embedding) != VECTOR_DIM:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding dimension mismatch. Expected {VECTOR_DIM}, got {len(embedding)}.",
        )

    insert_sql = """
    INSERT INTO rag_documents (source, content, metadata, embedding)
    VALUES (%s, %s, %s::jsonb, %s::vector)
    RETURNING id, source, content, metadata, created_at, updated_at;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                insert_sql,
                (
                    payload.source,
                    payload.content,
                    json.dumps(payload.metadata),
                    _to_pgvector(embedding),
                ),
            )
            row = cur.fetchone()
        conn.commit()

    return {
        "message": "Document ingested successfully.",
        "document": {
            "id": str(row[0]),
            "source": row[1],
            "content": row[2],
            "metadata": row[3],
            "created_at": row[4].isoformat(),
            "updated_at": row[5].isoformat(),
        },
    }


@app.put("/ingest/{document_id}")
def update_ingested_data(document_id: str, payload: UpdateIngestRequest) -> dict[str, Any]:
    embedding = _embed_text(payload.content)
    if len(embedding) != VECTOR_DIM:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding dimension mismatch. Expected {VECTOR_DIM}, got {len(embedding)}.",
        )

    update_sql = """
    UPDATE rag_documents
    SET source = %s,
        content = %s,
        metadata = %s::jsonb,
        embedding = %s::vector,
        updated_at = NOW()
    WHERE id = %s::uuid
    RETURNING id, source, content, metadata, created_at, updated_at;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                update_sql,
                (
                    payload.source,
                    payload.content,
                    json.dumps(payload.metadata),
                    _to_pgvector(embedding),
                    document_id,
                ),
            )
            row = cur.fetchone()
        conn.commit()

    if not row:
        raise HTTPException(status_code=404, detail="Document not found.")

    return {
        "message": "Document updated successfully.",
        "document": {
            "id": str(row[0]),
            "source": row[1],
            "content": row[2],
            "metadata": row[3],
            "created_at": row[4].isoformat(),
            "updated_at": row[5].isoformat(),
        },
    }


@app.post("/query")
def query_data(payload: QueryRequest) -> dict[str, Any]:
    query_embedding = _embed_query(payload.query)
    if len(query_embedding) != VECTOR_DIM:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding dimension mismatch. Expected {VECTOR_DIM}, got {len(query_embedding)}.",
        )

    retrieve_sql = """
    SELECT id, source, content, metadata, 1 - (embedding <=> %s::vector) AS similarity
    FROM rag_documents
    ORDER BY embedding <=> %s::vector
    LIMIT %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                retrieve_sql,
                (
                    _to_pgvector(query_embedding),
                    _to_pgvector(query_embedding),
                    payload.top_k,
                ),
            )
            rows = cur.fetchall()

    contexts = []
    docs = []
    for row in rows:
        docs.append(
            {
                "id": str(row[0]),
                "source": row[1],
                "content": row[2],
                "metadata": row[3],
                "similarity": float(row[4]),
            }
        )
        contexts.append(
            f"ID: {row[0]}\nSOURCE: {row[1]}\nCONTENT: {row[2]}\nMETADATA: {json.dumps(row[3])}"
        )

    prompt = (
        "You are a helpful RAG assistant. Use only the context below to answer.\n"
        "If the answer is not in context, clearly say you do not know.\n\n"
        f"QUESTION:\n{payload.query}\n\n"
        f"CONTEXT:\n{chr(10).join(contexts) if contexts else 'No context found.'}"
    )

    # 5. Update generation syntax for the new SDK
    llm_response = client.models.generate_content(
        model=LLM_MODEL,
        contents=prompt
    )
    answer = llm_response.text if hasattr(llm_response, "text") else ""

    return {
        "query": payload.query,
        "top_k": payload.top_k,
        "documents": docs,
        "answer": answer,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)