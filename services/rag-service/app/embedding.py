from fastapi import HTTPException
from openai import OpenAI
import time

from .config import EMBEDDING_MODEL, OPENAI_API_KEY, VECTOR_DIM

client = OpenAI(api_key=OPENAI_API_KEY)


def to_pgvector(vector: list[float]) -> str:
    return "[" + ",".join(str(x) for x in vector) + "]"


def _embed_text(text: str) -> list[float]:
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            result = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text
            )
            vector = result.data[0].embedding
            if len(vector) != VECTOR_DIM:
                raise HTTPException(
                    status_code=500,
                    detail=f"Embedding dimension mismatch. Expected {VECTOR_DIM}, got {len(vector)}.",
                )
            return vector
        except Exception as exc:
            last_exc = exc
            if "rate_limit" in str(exc).lower() or "429" in str(exc):
                wait_time = (attempt + 1) * 2
                time.sleep(wait_time)
                continue
            break

    raise HTTPException(
        status_code=502,
        detail=f"Embedding failed for model {EMBEDDING_MODEL}. Error: {last_exc}",
    ) from last_exc


def embed_document(text: str) -> list[float]:
    return _embed_text(text=text)


def embed_query(text: str) -> list[float]:
    return _embed_text(text=text)
