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


def generate_text(prompt: str) -> str:
    response = llm_client.models.generate_content(model=LLM_MODEL, contents=prompt)
    return response.text or ""


def link_user_to_document(user_id: str, document_id: str) -> None:
    logger.info(f"Linking user {user_id} to document {document_id}")
    sql = """
    INSERT INTO user_documents (user_id, document_id)
    VALUES (%s::uuid, %s::uuid)
    ON CONFLICT DO NOTHING;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id, document_id))
        conn.commit()


def link_room_to_document(room_id: str, document_id: str) -> None:
    logger.info(f"Linking room {room_id} to document {document_id}")
    sql = """
    INSERT INTO room_documents (room_id, document_id)
    VALUES (%s::uuid, %s::uuid)
    ON CONFLICT DO NOTHING;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (room_id, document_id))
        conn.commit()



def process_upload(file_bytes: bytes, file_name: str, extracted_text: str, user_id: str, room_id: str = None) -> dict[str, Any]:
    doc_hash = hashlib.sha256(file_bytes).hexdigest()
    
    # L1: Check Redis
    cached_doc_id = get_cached_document_id(doc_hash)
    if cached_doc_id:
        logger.info(f"Redis cache hit for doc hash: {doc_hash}")
        if room_id:
            link_room_to_document(room_id, cached_doc_id)
        else:
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
                logger.info(f"Postgres cache hit for doc hash: {doc_hash} -> doc_id: {doc_id}")
                set_cached_document_id(doc_hash, doc_id)
                if room_id:
                    link_room_to_document(room_id, doc_id)
                else:
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
            
            # FALLBACK: If LLM failed to divide into topics, create one default topic
            if not parts:
                logger.info("Triggering fallback topic: General Overview")
                parts = [{
                    "title": "General Overview",
                    "time_minutes": 25,
                    "outline": extracted_text[:5000] # Use the start as chunk content
                }]

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
                    
                    # Generate questions for this chunk
                    questions = generate_questions(chunk_text_val, topic_title)
                    if not questions:
                        raise HTTPException(
                            status_code=500,
                            detail=f"Failed to generate questions for chunk {chunk_idx} of topic '{topic_title}'"
                        )
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
                    
                    # STAGGER: Wait slightly between chunks to avoid rate limiting
                    time.sleep(0.5)
        conn.commit()

    # Backfill Cache & Link
    set_cached_document_id(doc_hash, doc_id)
    if room_id:
        link_room_to_document(room_id, doc_id)
    else:
        link_user_to_document(user_id, doc_id)
    topics = get_topics_from_cache(doc_id)
    
    return {
        "document_id": doc_id,
        "cached": False,
        "file_name": file_name,
        "topics": topics
    }


def delete_document(doc_id: str, user_id: str) -> None:
    """Deletes a document and its associated chunks/questions/cache."""
    logger.info(f"User {user_id} requested deletion of document {doc_id}")
    
    # 1. Fetch document info (hash) before deleting for cache clearing
    doc_hash = None
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT hash FROM documents WHERE id = %s", (doc_id,))
            row = cur.fetchone()
            if row:
                doc_hash = row[0]
            
            # 2. Verify ownership (via link table)
            cur.execute("SELECT 1 FROM user_documents WHERE user_id = %s::uuid AND document_id = %s::uuid", (user_id, doc_id))
            if not cur.fetchone():
                # Check room documents as fallback if user has rights
                cur.execute("SELECT 1 FROM room_documents WHERE document_id = %s::uuid", (doc_id,))
                if not cur.fetchone():
                    logger.warning(f"Unauthorized deletion attempt by {user_id} for doc {doc_id}")
                    raise HTTPException(status_code=403, detail="Not authorized to delete this document.")

            # 3. Delete from DB (CASCADES will handle chunks/questions)
            cur.execute("DELETE FROM documents WHERE id = %s", (doc_id,))
            conn.commit()

    # 4. Clear Cache
    from .cache import redis_client
    if redis_client:
        try:
            if doc_hash:
                redis_client.delete(f"doc:hash:{doc_hash}")
            redis_client.delete(f"doc:{doc_id}:topics")
            # Clear all question caches for this doc (wildcard)
            keys = redis_client.keys(f"doc:{doc_id}:questions:*")
            if keys:
                redis_client.delete(*keys)
            logger.info(f"Cleared cache for document {doc_id}")
        except Exception as e:
            logger.error(f"Failed to clear cache for {doc_id}: {e}")


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

    set_cached_topics(doc_id, topics)
    return topics


def get_questions_from_db(doc_id: str, chunk_id: str) -> list[dict[str, Any]]:
    """Fetches questions from Postgres and re-populates cache if missing."""
    cached = get_cached_questions(doc_id, chunk_id)
    if cached:
        return cached

    # Fetch from Postgres
    questions = []
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, question, options, answer, difficulty 
                FROM questions
                WHERE document_id = %s::uuid AND chunk_id = %s::uuid
            """, (doc_id, chunk_id))
            rows = cur.fetchall()
            for row in rows:
                questions.append({
                    "id": str(row[0]),
                    "question": row[1],
                    "options": row[2] if isinstance(row[2], list) else json.loads(row[2]) if row[2] else [],
                    "answer": row[3],
                    "difficulty": row[4]
                })

            # FALLBACK: If no questions found in DB, generate them now!
            if not questions:
                logger.info(f"Questions missing for chunk {chunk_id}. Generating on-demand...")
                cur.execute("SELECT content, topic FROM document_chunks WHERE id = %s::uuid", (chunk_id,))
                chunk_row = cur.fetchone()
                if chunk_row:
                    content, topic = chunk_row
                    new_questions = generate_questions(content, topic)
                    for q in new_questions:
                        cur.execute(
                            """
                            INSERT INTO questions (document_id, chunk_id, question, options, answer, difficulty)
                            VALUES (%s, %s, %s, %s::jsonb, %s, %s) RETURNING id;
                            """,
                            (
                                doc_id, chunk_id, q.get("question"),
                                json.dumps(q.get("options", [])),
                                q.get("options")[q.get("correct_index", 0)] if q.get("options") else "",
                                q.get("difficulty", "medium")
                            )
                        )
                        q_id = str(cur.fetchone()[0])
                        questions.append({
                            "id": q_id,
                            "question": q.get("question"),
                            "options": q.get("options", []),
                            "answer": q.get("options")[q.get("correct_index", 0)] if q.get("options") else "",
                            "difficulty": q.get("difficulty", "medium")
                        })
                    conn.commit()

    if questions:
        set_cached_questions(doc_id, chunk_id, questions)
    
    return questions


def list_user_documents(user_id: str) -> dict[str, Any]:
    logger.info(f"Listing documents for user: {user_id}")
    sql = """
    SELECT d.id, d.file_name, d.content_length, d.created_at
    FROM documents d
    JOIN user_documents ud ON d.id = ud.document_id
    WHERE ud.user_id = %s::uuid
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
    logger.info(f"Found {len(docs)} documents for user {user_id}")
    return {"count": len(docs), "documents": docs}


def list_room_documents(room_id: str) -> dict[str, Any]:
    logger.info(f"Listing documents for room: {room_id}")
    sql = """
    SELECT d.id, d.file_name, d.content_length, d.created_at
    FROM documents d
    JOIN room_documents rd ON d.id = rd.document_id
    WHERE rd.room_id = %s::uuid
    ORDER BY d.created_at DESC;
    """
    docs = []
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (room_id,))
            rows = cur.fetchall()
            for row in rows:
                docs.append({
                    "id": str(row[0]),
                    "file_name": row[1],
                    "content_length": row[2],
                    "created_at": row[3].isoformat() if row[3] else None
                })
    return {"count": len(docs), "documents": docs}


def get_diagnostics() -> dict[str, Any]:
    """Returns raw counts and system info for troubleshooting."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM documents")
            total_docs = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM user_documents")
            total_links = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM document_chunks")
            total_chunks = cur.fetchone()[0]
            
            # Count documents that have NO chunks
            cur.execute("""
                SELECT COUNT(*) FROM documents d 
                LEFT JOIN document_chunks dc ON d.id = dc.document_id 
                WHERE dc.id IS NULL
            """)
            orphaned_docs = cur.fetchone()[0]
            
    return {
        "status": "active",
        "database": "local-postgres",
        "counts": {
            "documents": total_docs,
            "user_documents": total_links,
            "document_chunks": total_chunks,
            "orphaned_documents": orphaned_docs
        }
    }



def query_documents(query: str, top_k: int, user_id: str, room_id: str = None) -> dict[str, Any]:
    logger.info(f"Querying documents: {query} (user: {user_id}, room: {room_id})")
    query_embedding = embed_query(query)
    
    if room_id:
        retrieve_sql = """
        SELECT dc.id, dc.topic, dc.content, 1 - (dc.embedding <=> %s::vector) AS similarity
        FROM document_chunks dc
        JOIN room_documents rd ON rd.document_id = dc.document_id
        WHERE rd.room_id = %s
        ORDER BY dc.embedding <=> %s::vector
        LIMIT %s;
        """
        params = (to_pgvector(query_embedding), room_id, to_pgvector(query_embedding), top_k)
    else:
        retrieve_sql = """
        SELECT dc.id, dc.topic, dc.content, 1 - (dc.embedding <=> %s::vector) AS similarity
        FROM document_chunks dc
        JOIN user_documents ud ON ud.document_id = dc.document_id
        WHERE ud.user_id = %s
        ORDER BY dc.embedding <=> %s::vector
        LIMIT %s;
        """
        params = (to_pgvector(query_embedding), user_id, to_pgvector(query_embedding), top_k)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(retrieve_sql, params)
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

    print(docs)
    print(contexts)
    prompt = (
        "You are a helpful RAG assistant. Use only the context below to answer.\n"
        "If the answer is not in context, clearly say you do not know.\n\n"
        f"QUESTION:\n{query}\n\n"
        f"CONTEXT:\n{chr(10).join(contexts) if contexts else 'No context found.'}"
    )
    llm_response = None
    try:
        answer = generate_text(prompt)
    except Exception as e:
        logger.error(f"Gemini query error: {str(e)}")
        answer = "Failed to generate answer."

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
    try:
        for chunk in llm_client.models.generate_content_stream(model=LLM_MODEL, contents=prompt):
            if chunk.text:
                yield json.dumps({"type": "chunk", "content": chunk.text}) + "\n"
    except Exception as e:
        logger.error(f"Gemini stream error: {str(e)}")


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
    try:
        response_text = generate_text(prompt)
        parsed = json.loads(response_text)
        questions = parsed.get("questions", parsed)
        if not questions:
            raise ValueError("LLM returned empty questions array")
        # Validate each question has required fields
        for q in questions:
            if not all(k in q for k in ("question", "options", "correct_index", "difficulty")):
                raise ValueError(f"Invalid question format: {q}")
            if not isinstance(q["options"], list) or len(q["options"]) != 4:
                raise ValueError(f"Question must have 4 options: {q}")
        logger.info(f"Generated {len(questions)} questions for topic: {part_title}")
        return questions
    except Exception as e:
        logger.error(f"Gemini generate_questions error for '{part_title}': {str(e)}")
        raise


def summarize_text(text: str) -> dict[str, Any]:
    """Divides document into topics using LLM. Returns standard JSON schema."""
    prompt = (
        "Analyze the following document and divide it into study topics. Each topic should be designed to take no more than 25 minutes to study. Assign an estimated study time in minutes to each topic (maximum 25 minutes per topic). Provide a title for each topic, and an outline of everything that comes in that part including all the keywords.\n\n"
        "IMPORTANT: You MUST respond ONLY with a valid JSON object. Do not include preamble or markdown blocks if possible, but if you do, wrap it in ```json blocks.\n\n"
        "JSON SCHEMA:\n"
        "{\n"
        '  "number_of_parts": <int>,\n'
        '  "parts": [\n'
        "    {\n"
        '      "title": "Topic Name",\n'
        '      "time_minutes": 20,\n'
        '      "outline": "Summary of content..." \n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        f"DOCUMENT:\n{text[:25000]}"
    )
    try:
        logger.info(f"Summarizing with {LLM_MODEL}...")
        response_text = generate_text(prompt)
        data = json.loads(response_text)
        if "parts" not in data or not data["parts"]:
            return {"number_of_parts": 0, "parts": []}
        return data
    except Exception as e:
        logger.error(f"Gemini summarize_text error: {str(e)}")
        return {"number_of_parts": 0, "parts": []}
