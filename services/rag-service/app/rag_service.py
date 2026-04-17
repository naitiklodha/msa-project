import json
import logging
import re
import time
from typing import Any, Generator

from fastapi import HTTPException
from google import genai
from google.api_core.exceptions import ServiceUnavailable, InternalServerError, ResourceExhausted

from .config import GOOGLE_API_KEY, LLM_MODEL
from .db import get_connection
from .embedding import embed_document, embed_query, to_pgvector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    llm_models = [LLM_MODEL, "models/gemini-2.5-pro", "models/gemini-2.5-flash"]

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


def stream_query_documents(query: str, top_k: int) -> Generator[str, None, None]:
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

    # First yield the initial data
    initial_data = {
        "type": "metadata",
        "query": query,
        "top_k": top_k,
        "documents": docs,
    }
    yield json.dumps(initial_data) + "\n"

    prompt = (
        "You are a helpful RAG assistant. Use only the context below to answer.\n"
        "If the answer is not in context, clearly say you do not know.\n\n"
        f"QUESTION:\n{query}\n\n"
        f"CONTEXT:\n{chr(10).join(contexts) if contexts else 'No context found.'}"
    )
    llm_models = [LLM_MODEL, "models/gemini-2.5-pro", "models/gemini-2.5-flash"]

    llm_response_stream = None
    last_exc: Exception | None = None
    for model_name in llm_models:
        try:
            llm_response_stream = llm_client.models.generate_content_stream(
                model=model_name,
                contents=prompt,
            )
            # Try getting the first chunk to catch early errors
            iterator = iter(llm_response_stream)
            first_chunk = next(iterator)
            if first_chunk.text:
                yield json.dumps({"type": "chunk", "content": first_chunk.text}) + "\n"
            
            # If successful, yield the rest of the stream
            for chunk in iterator:
                if chunk.text:
                    yield json.dumps({"type": "chunk", "content": chunk.text}) + "\n"
            break
        except StopIteration:
            break
        except Exception as exc:
            last_exc = exc

    if not llm_response_stream and last_exc is not None:
        yield json.dumps({
            "type": "error",
            "error": f"Generation failed. Check GEMINI_LLM_MODEL/API access. Error: {last_exc}"
        }) + "\n"


def generate_questions(part_content: str, part_title: str) -> list[dict[str, Any]]:
    logger.info("Generating questions for part: %s", part_title)
    prompt = (
        f"Generate 10 multiple-choice questions based on the following content from the section '{part_title}'. "
        "The questions should be of varying difficulty: 3 easy, 5 medium, and 2 hard. "
        "Each question must have 4 options, with exactly one correct answer. "
        "The options should be plausible but not obvious, and the correct option should be randomly positioned (not following any pattern like always B or A/C). "
        "Output in JSON format only as an array of objects:\n\n"
        "[\n"
        "  {\n"
        '    "question": "string",\n'
        '    "options": ["option1", "option2", "option3", "option4"],\n'
        '    "correct_index": 0-3,\n'
        '    "difficulty": "easy"|"medium"|"hard"\n'
        "  },\n"
        "  ...\n"
        "]\n\n"
        f"CONTENT:\n{part_content}"
    )
    llm_models = [LLM_MODEL, "models/gemini-2.5-pro", "models/gemini-2.5-flash"]

    llm_response = None
    last_exc: Exception | None = None
    for model_name in llm_models:
        logger.info("Trying LLM model for questions: %s", model_name)
        try:
            llm_response = llm_client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            logger.info("Successfully generated questions with model: %s", model_name)
            break
        except Exception as exc:
            logger.warning("Failed with model %s for questions: %s", model_name, exc)
            last_exc = exc

    if llm_response is None:
        logger.error("All LLM models failed for questions")
        return []

    response_text = llm_response.text if hasattr(llm_response, "text") else ""
    logger.info("Received questions response, length: %d", len(response_text))
    
    # Extract JSON from markdown code blocks if present
    json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        json_str = response_text
    
    try:
        questions = json.loads(json_str)
        logger.info("Successfully parsed %d questions", len(questions))
        return questions
    except json.JSONDecodeError as e:
        logger.warning("Failed to parse questions JSON: %s", e)
        return []


def summarize_text(text: str) -> dict[str, Any]:
    logger.info("Starting topic division for document of length %d", len(text))
    prompt = (
        "Analyze the following document and divide it into study topics. Each topic should be designed to take no more than 25 minutes to study. Assign an estimated study time in minutes to each topic (maximum 25 minutes per topic). Provide a title for each topic, and an outline of everything that comes in that part including all the keywords.\n\n"
        "If the document is too complex or results in too many parts, suggest dividing it into separate documents, but still provide the division for the current text.\n\n"
        "Output in JSON format only:\n\n"
        "{\n"
        '"number_of_parts": <int>,\n'
        '"parts": [\n'
        '{\n'
        '"title": "<string>",\n'
        '"time_minutes": <int>,\n'
        '"outline": "<string with keywords and outline>"\n'
        '},\n'
        '...]\n'
        "}\n\n"
        f"DOCUMENT:\n{text[:20000]}"
    )
    llm_models = [LLM_MODEL, "models/gemini-2.5-pro", "models/gemini-2.5-flash"]

    llm_response = None
    last_exc: Exception | None = None
    max_retries = 3
    retry_delay = 2  # Initial delay in seconds
    
    for model_name in llm_models:
        logger.info("Trying LLM model: %s", model_name)
        for attempt in range(max_retries):
            try:
                llm_response = llm_client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                logger.info("Successfully generated response with model: %s", model_name)
                break
            except (ServiceUnavailable, InternalServerError) as exc:
                # Handle 503/500 errors with exponential backoff
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)
                    logger.warning(
                        "Model %s returned error (attempt %d/%d). Retrying in %d seconds: %s",
                        model_name, attempt + 1, max_retries, wait_time, exc
                    )
                    time.sleep(wait_time)
                else:
                    logger.warning("Failed with model %s after %d retries: %s", model_name, max_retries, exc)
                    last_exc = exc
            except ResourceExhausted as exc:
                # Handle 429 quota exceeded - don't retry, user needs to upgrade plan
                logger.error("Quota exceeded for model %s: %s", model_name, exc)
                last_exc = exc
                break
            except Exception as exc:
                logger.warning("Failed with model %s: %s", model_name, exc)
                last_exc = exc
                break
        
        if llm_response is not None:
            break

    if llm_response is None:
        logger.error("All LLM models failed")
        if isinstance(last_exc, ResourceExhausted):
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Gemini API quota exceeded. You've reached your free tier limits. "
                    f"Please upgrade your Google AI plan at https://ai.google.dev/pricing or wait for quota reset. "
                    f"Error: {last_exc}"
                ),
            ) from last_exc
        else:
            raise HTTPException(
                status_code=502,
                detail=(
                    f"Topic division failed for tried models {llm_models}. "
                    f"Check GEMINI_LLM_MODEL/API access. Error: {last_exc}"
                ),
            ) from last_exc

    response_text = llm_response.text if hasattr(llm_response, "text") else ""
    logger.info("Received response from LLM, length: %d", len(response_text))
    
    # Extract JSON from markdown code blocks if present
    json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
        logger.info("Extracted JSON from markdown code block")
    else:
        json_str = response_text
    
    try:
        result = json.loads(json_str)
        logger.info("Successfully parsed JSON with %d parts", result.get("number_of_parts", 0))
        return result
    except json.JSONDecodeError as e:
        logger.warning("Failed to parse JSON: %s", e)
        # If not valid JSON, return as summary
        return {"summary": response_text}
