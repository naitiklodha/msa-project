import json
import logging
import re
import time
import hashlib
from typing import Any, Generator

from fastapi import HTTPException
from google import genai

from .config import GOOGLE_API_KEY, LLM_MODEL
from .db import get_connection
from .embedding import embed_document, embed_query, to_pgvector
from .chunking import chunk_text
from .cache import (
    get_cached_document_id,
    set_cached_document_id,
    get_cached_topics,
    set_cached_topics,
    get_cached_questions,
    set_cached_questions
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

llm_client = genai.Client(api_key=GOOGLE_API_KEY)


def link_user_to_document(user_id: str, document_id: str) -> None:
    sql = """
    INSERT INTO user_documents (user_id, document_id)
    VALUES (%s, %s)
    ON CONFLICT DO NOTHING;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id, document_id))
        conn.commit()


def process_upload(file_bytes: bytes, file_name: str, extracted_text: str, user_id: str) -> dict[str, Any]:
    doc_hash = hashlib.sha256(file_bytes).hexdigest()
    
    # L1: Check Redis
    cached_doc_id = get_cached_document_id(doc_hash)
    if cached_doc_id:
        logger.info(f"Redis cache hit for doc hash: {doc_hash}")
        link_user_to_document(user_id, cached_doc_id)
        topics = get_topics_from_cache(cached_doc_id)
        return {
            "document_id": cached_doc_id,
            "cached": True,
            "file_name": file_name,
            "topics": topics
        }

    # L2: Check Postgres
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM documents WHERE hash = %s", (doc_hash,))
            row = cur.fetchone()
            if row:
                doc_id = str(row[0])
                logger.info(f"Postgres cache hit for doc hash: {doc_hash}")
                set_cached_document_id(doc_hash, doc_id)
                link_user_to_document(user_id, doc_id)
                topics = get_topics_from_cache(doc_id)
                return {
                    "document_id": doc_id,
                    "cached": True,
                    "file_name": file_name,
                    "topics": topics
                }

    # Miss: Run Full RAG Pipeline
    logger.info(f"Cache miss for doc hash: {doc_hash}. Running full pipeline.")
    
    # 1. Summarize into topics
    topic_division = summarize_text(extracted_text)
    
    with get_connection() as conn:
        with conn.cursor() as cur:
            # 2. Store in documents
            cur.execute(
                "INSERT INTO documents (hash, file_name, content_length) VALUES (%s, %s, %s) RETURNING id;",
                (doc_hash, file_name, len(extracted_text))
            )
            doc_id = str(cur.fetchone()[0])
            
            # 3. Process each part/topic
            parts = topic_division.get("parts", [])
            for i, part in enumerate(parts):
                topic_title = part.get("title", f"Part {i+1}")
                time_est_s = part.get("time_minutes", 25) * 60
                outline = part.get("outline", "")
                
                # Chunk the outline text
                chunks = chunk_text(outline)
                for chunk_idx, chunk_text_val in enumerate(chunks):
                    # Embed
                    embedding = embed_document(chunk_text_val)
                    
                    # Store chunk
                    cur.execute(
                        """
                        INSERT INTO document_chunks (document_id, chunk_index, topic, time_est_s, content, embedding)
                        VALUES (%s, %s, %s, %s, %s, %s::vector) RETURNING id;
                        """,
                        (doc_id, chunk_idx, topic_title, time_est_s, chunk_text_val, to_pgvector(embedding))
                    )
                    chunk_id = str(cur.fetchone()[0])
                    
                    # Generate questions for this chunk (if it's substantial)
                    # We generate questions based on the chunk_text_val
                    questions = generate_questions(chunk_text_val, topic_title)
                    for q in questions:
                        cur.execute(
                            """
                            INSERT INTO questions (document_id, chunk_id, question, options, answer, difficulty)
                            VALUES (%s, %s, %s, %s::jsonb, %s, %s)
                            """,
                            (
                                doc_id, chunk_id, q.get("question"),
                                json.dumps(q.get("options", [])),
                                q.get("options", [])[q.get("correct_index", 0)] if q.get("options") else "",
                                q.get("difficulty", "medium")
                            )
                        )
        conn.commit()

    # Backfill Cache & Link User
    set_cached_document_id(doc_hash, doc_id)
    link_user_to_document(user_id, doc_id)
    topics = get_topics_from_cache(doc_id)
    
    return {
        "document_id": doc_id,
        "cached": False,
        "file_name": file_name,
        "topics": topics
    }


def get_topics_from_cache(doc_id: str) -> list[dict[str, Any]]:
    cached = get_cached_topics(doc_id)
    if cached:
        return cached

    # Fetch from Postgres
    sql = """
        SELECT id as chunk_id, topic, time_est_s, chunk_index
        FROM document_chunks 
        WHERE document_id = %s
        ORDER BY chunk_index
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (doc_id,))
            rows = cur.fetchall()
            
    topics = []
    # Distinct topics
    seen = set()
    for row in rows:
        topic_name = row[1]
        if topic_name not in seen:
            seen.add(topic_name)
            topics.append({
                "chunk_id": str(row[0]),
                "topic": topic_name,
                "time_est_s": row[2]
            })

    set_cached_topics(doc_id, {"topics": topics})
    return topics


def list_user_documents(user_id: str) -> dict[str, Any]:
    sql = """
    SELECT d.id, d.file_name, d.content_length, d.created_at
    FROM documents d
    JOIN user_documents ud ON d.id = ud.document_id
    WHERE ud.user_id = %s
    ORDER BY d.created_at DESC;
    """
    docs = []
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id,))
            rows = cur.fetchall()
            for row in rows:
                docs.append({
                    "id": str(row[0]),
                    "file_name": row[1],
                    "content_length": row[2],
                    "created_at": row[3].isoformat() if row[3] else None
                })
    return {"count": len(docs), "documents": docs}


def query_documents(query: str, top_k: int, user_id: str) -> dict[str, Any]:
    query_embedding = embed_query(query)
    retrieve_sql = """
    SELECT dc.id, dc.topic, dc.content, 1 - (dc.embedding <=> %s::vector) AS similarity
    FROM document_chunks dc
    JOIN user_documents ud ON ud.document_id = dc.document_id
    WHERE ud.user_id = %s
    ORDER BY dc.embedding <=> %s::vector
    LIMIT %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(retrieve_sql, (to_pgvector(query_embedding), to_pgvector(query_embedding), user_id, top_k))
            rows = cur.fetchall()

    contexts = []
    docs = []
    for row in rows:
        docs.append({
            "id": str(row[0]),
            "topic": row[1],
            "content": row[2],
            "similarity": float(row[3]),
        })
        contexts.append(f"TOPIC: {row[1]}\nCONTENT: {row[2]}")

    prompt = (
        "You are a helpful RAG assistant. Use only the context below to answer.\n"
        "If the answer is not in context, clearly say you do not know.\n\n"
        f"QUESTION:\n{query}\n\n"
        f"CONTEXT:\n{chr(10).join(contexts) if contexts else 'No context found.'}"
    )
    llm_models = [LLM_MODEL, "models/gemini-2.5-pro", "models/gemini-2.5-flash"]

    llm_response = None
    for model_name in llm_models:
        try:
            llm_response = llm_client.models.generate_content(model=model_name, contents=prompt)
            break
        except Exception:
            pass

    answer = llm_response.text if llm_response and hasattr(llm_response, "text") else "Failed to generate answer."

    return {
        "query": query,
        "top_k": top_k,
        "documents": docs,
        "answer": answer,
    }


def stream_query_documents(query: str, top_k: int, user_id: str) -> Generator[str, None, None]:
    query_embedding = embed_query(query)
    retrieve_sql = """
    SELECT dc.id, dc.topic, dc.content, 1 - (dc.embedding <=> %s::vector) AS similarity
    FROM document_chunks dc
    JOIN user_documents ud ON ud.document_id = dc.document_id
    WHERE ud.user_id = %s
    ORDER BY dc.embedding <=> %s::vector
    LIMIT %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(retrieve_sql, (to_pgvector(query_embedding), to_pgvector(query_embedding), user_id, top_k))
            rows = cur.fetchall()

    contexts = []
    docs = []
    for row in rows:
        docs.append({
            "id": str(row[0]),
            "topic": row[1],
            "content": row[2],
            "similarity": float(row[3]),
        })
        contexts.append(f"TOPIC: {row[1]}\nCONTENT: {row[2]}")

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

    for model_name in llm_models:
        try:
            llm_response_stream = llm_client.models.generate_content_stream(model=model_name, contents=prompt)
            for chunk in llm_response_stream:
                if chunk.text:
                    yield json.dumps({"type": "chunk", "content": chunk.text}) + "\n"
            break
        except Exception:
            pass


# ---------------------------------------------------------
# Same summarize & generate_questions logic as before
# ---------------------------------------------------------

def generate_questions(part_content: str, part_title: str) -> list[dict[str, Any]]:
    prompt = (
        f"Generate 5 multiple-choice questions based on the following content from the section '{part_title}'. "
        "The questions should be of varying difficulty: 2 easy, 2 medium, and 1 hard. "
        "Each question must have 4 options, with exactly one correct answer. "
        "Output in JSON format only as an array of objects:\n\n"
        "[\n"
        "  {\n"
        '    "question": "string",\n'
        '    "options": ["option1", "option2", "option3", "option4"],\n'
        '    "correct_index": 0-3,\n'
        '    "difficulty": "easy"|"medium"|"hard"\n'
        "  }\n"
        "]\n\n"
        f"CONTENT:\n{part_content}"
    )
    llm_models = [LLM_MODEL, "models/gemini-2.5-pro", "models/gemini-2.5-flash"]

    llm_response = None
    for model_name in llm_models:
        try:
            llm_response = llm_client.models.generate_content(model=model_name, contents=prompt)
            break
        except Exception:
            pass

    if llm_response is None:
        return []

    response_text = llm_response.text if hasattr(llm_response, "text") else ""
    json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
    json_str = json_match.group(1) if json_match else response_text
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return []


def summarize_text(text: str) -> dict[str, Any]:
    prompt = (
        "Analyze the following document and divide it into study topics. Each topic should be designed to take no more than 25 minutes to study. Assign an estimated study time in minutes to each topic (maximum 25 minutes per topic). Provide a title for each topic, and an outline of everything that comes in that part including all the keywords.\n\n"
        "Output in JSON format only:\n\n"
        "{\n"
        '"number_of_parts": <int>,\n'
        '"parts": [\n'
        '{\n'
        '"title": "<string>",\n'
        '"time_minutes": <int>,\n'
        '"outline": "<string with keywords and outline>"\n'
        '}\n'
        ']\n'
        "}\n\n"
        f"DOCUMENT:\n{text[:20000]}"
    )
    llm_models = [LLM_MODEL, "models/gemini-2.5-pro", "models/gemini-2.5-flash"]

    llm_response = None
    for model_name in llm_models:
        try:
            llm_response = llm_client.models.generate_content(model=model_name, contents=prompt)
            break
        except Exception:
            pass

    if llm_response is None:
        return {"number_of_parts": 0, "parts": []}

    response_text = llm_response.text if hasattr(llm_response, "text") else ""
    json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
    json_str = json_match.group(1) if json_match else response_text
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return {"number_of_parts": 0, "parts": []}
