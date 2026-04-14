from fastapi import HTTPException
from google import genai
from google.genai import types

from .config import EMBEDDING_MODEL, GOOGLE_API_KEY, VECTOR_DIM

client = genai.Client(api_key=GOOGLE_API_KEY)


def to_pgvector(vector: list[float]) -> str:
    return "[" + ",".join(str(x) for x in vector) + "]"


def _embed_with_task(text: str, task_type: str) -> list[float]:
    primary_model = EMBEDDING_MODEL
    fallback_model = "models/gemini-embedding-001"
    models_to_try = [primary_model]
    if primary_model != fallback_model:
        models_to_try.append(fallback_model)

    last_exc: Exception | None = None
    for model_name in models_to_try:
        try:
            result = client.models.embed_content(
                model=model_name,
                contents=text,
                config=types.EmbedContentConfig(
                    task_type=task_type,
                    output_dimensionality=VECTOR_DIM,
                ),
            )
            vector = result.embeddings[0].values
            if len(vector) != VECTOR_DIM:
                raise HTTPException(
                    status_code=500,
                    detail=f"Embedding dimension mismatch. Expected {VECTOR_DIM}, got {len(vector)}.",
                )
            return vector
        except Exception as exc:
            last_exc = exc

    raise HTTPException(
        status_code=502,
        detail=(
            f"Embedding failed for tried models {models_to_try}. "
            f"Check EMBEDDING_MODEL/API access. Error: {last_exc}"
        ),
    ) from last_exc


def embed_document(text: str) -> list[float]:
    return _embed_with_task(text=text, task_type="RETRIEVAL_DOCUMENT")


def embed_query(text: str) -> list[float]:
    return _embed_with_task(text=text, task_type="RETRIEVAL_QUERY")
