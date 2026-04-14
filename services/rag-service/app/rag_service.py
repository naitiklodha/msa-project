import json
from typing import Any

from fastapi import HTTPException
from google import genai

from .config import GOOGLE_API_KEY, LLM_MODEL
from .db import get_connection
from .embedding import embed_document, embed_query, to_pgvector

llm_client = genai.Client(api_key=GOOGLE_API_KEY)


def ingest_content(source: str | None, content: str, metadata: dict[str, Any], chunks: list[str]) -> dict[str, Any]:
    insert_sql = """
    INSERT INTO rag_documents (source, content, metadata, embedding)
    VALUES (%s, %s, %s::jsonb, %s::vector)
    RETURNING id, source, content, metadata, created_at, updated_at;
    """
    inserted_docs: list[dict[str, Any]] = []

    with get_connection() as conn:
        with conn.cursor() as cur:
            for idx, chunk in enumerate(chunks):
                chunk_embedding = embed_document(chunk)
                chunk_metadata = dict(metadata)
                chunk_metadata.update(
                    {
                        "chunk_index": idx,
                        "chunk_count": len(chunks),
                    }
                )
                cur.execute(
                    insert_sql,
                    (
                        source,
                        chunk,
                        json.dumps(chunk_metadata),
                        to_pgvector(chunk_embedding),
                    ),
                )
                row = cur.fetchone()
                inserted_docs.append(
                    {
                        "id": str(row[0]),
                        "source": row[1],
                        "content": row[2],
                        "metadata": row[3],
                        "created_at": row[4].isoformat(),
                        "updated_at": row[5].isoformat(),
                    }
                )
        conn.commit()

    return {
        "message": "Document ingested successfully.",
        "chunks_created": len(inserted_docs),
        "documents": inserted_docs,
    }


def update_document(document_id: str, source: str | None, content: str, metadata: dict[str, Any]) -> dict[str, Any]:
    embedding = embed_document(content)
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
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                update_sql,
                (
                    source,
                    content,
                    json.dumps(metadata),
                    to_pgvector(embedding),
                    document_id,
                ),
            )
            row = cur.fetchone()
        conn.commit()

    if not row:
        return {"message": "Document not found.", "document": None}

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


def list_documents(limit: int = 20) -> dict[str, Any]:
    sql = """
    SELECT id, source, content, metadata, created_at, updated_at
    FROM rag_documents
    ORDER BY created_at DESC
    LIMIT %s;
    """
    docs: list[dict[str, Any]] = []
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (limit,))
            rows = cur.fetchall()
    for row in rows:
        docs.append(
            {
                "id": str(row[0]),
                "source": row[1],
                "content": row[2],
                "metadata": row[3],
                "created_at": row[4].isoformat(),
                "updated_at": row[5].isoformat(),
            }
        )
    return {"count": len(docs), "documents": docs}


def query_documents(query: str, top_k: int) -> dict[str, Any]:
    query_embedding = embed_query(query)
    retrieve_sql = """
    SELECT id, source, content, metadata, 1 - (embedding <=> %s::vector) AS similarity
    FROM rag_documents
    ORDER BY embedding <=> %s::vector
    LIMIT %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                retrieve_sql,
                (
                    to_pgvector(query_embedding),
                    to_pgvector(query_embedding),
                    top_k,
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
        f"QUESTION:\n{query}\n\n"
        f"CONTEXT:\n{chr(10).join(contexts) if contexts else 'No context found.'}"
    )
    llm_models = [LLM_MODEL]
    if LLM_MODEL != "models/gemini-2.5-flash":
        llm_models.append("models/gemini-2.5-flash")

    llm_response = None
    last_exc: Exception | None = None
    for model_name in llm_models:
        try:
            llm_response = llm_client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            break
        except Exception as exc:
            last_exc = exc

    if llm_response is None:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Generation failed for tried models {llm_models}. "
                f"Check GEMINI_LLM_MODEL/API access. Error: {last_exc}"
            ),
        ) from last_exc

    answer = llm_response.text if hasattr(llm_response, "text") else ""

    return {
        "query": query,
        "top_k": top_k,
        "documents": docs,
        "answer": answer,
    }


def summarize_text(text: str) -> dict[str, str]:
    prompt = (
        "Summarize the following document in 5-8 bullet points. "
        "Then provide 3 key takeaways.\n\n"
        f"DOCUMENT:\n{text[:20000]}"
    )
    llm_models = [LLM_MODEL]
    if LLM_MODEL != "models/gemini-2.5-flash":
        llm_models.append("models/gemini-2.5-flash")

    llm_response = None
    last_exc: Exception | None = None
    for model_name in llm_models:
        try:
            llm_response = llm_client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            break
        except Exception as exc:
            last_exc = exc

    if llm_response is None:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Summary generation failed for tried models {llm_models}. "
                f"Check GEMINI_LLM_MODEL/API access. Error: {last_exc}"
            ),
        ) from last_exc

    summary = llm_response.text if hasattr(llm_response, "text") else ""
    return {"summary": summary}
