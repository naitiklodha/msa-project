import psycopg

from .config import POSTGRES_URL, VECTOR_DIM


def get_connection() -> psycopg.Connection:
    return psycopg.connect(POSTGRES_URL)


def init_db() -> None:
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
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(create_sql)
        conn.commit()
