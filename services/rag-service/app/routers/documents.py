import json
import logging
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, Depends

from ..file_processing import extract_text_from_file
from ..rag_service import process_upload, list_user_documents
from ..auth import get_current_user
from ..cache import (
    get_cached_topics, 
    get_cached_questions, 
    start_quiz_session,
    record_session_result,
    get_session_results
)
from ..kafka_producer import emit_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload/breakdown-with-questions")
async def upload_with_questions(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
) -> dict[str, Any]:
    """
    Upload a document, dedup via hash, chunk, embed, and return topics.
    """
    logger.info("Starting upload for file: %s", file.filename)
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    raw_bytes = await file.read()
    logger.info("Read %d bytes from file", len(raw_bytes))
    
    try:
        text, ext = extract_text_from_file(file.filename, raw_bytes)
    except Exception:
        text = "" # Fallback
    
    # Process the upload through the deduplication flow
    result = process_upload(file_bytes=raw_bytes, file_name=file.filename, extracted_text=text, user_id=user_id)
    
    return result


@router.get("")
def get_documents(
    limit: int = Query(default=20, ge=1, le=100),
    user_id: str = Depends(get_current_user)
) -> dict[str, Any]:
    return list_user_documents(user_id)


@router.get("/{document_id}/topics")
def fetch_topics(document_id: str, user_id: str = Depends(get_current_user)) -> dict[str, Any]:
    topics = get_cached_topics(document_id)
    if not topics:
        # Note: If cache expires, it currently doesn't re-fetch from DB in this direct endpoint.
        # process_upload auto-caches it. Let's assume the client gets topics from upload.
        raise HTTPException(status_code=404, detail="Topics not found in cache.")
    return topics


@router.get("/{document_id}/chunks/{chunk_id}/questions")
def fetch_questions(document_id: str, chunk_id: str, user_id: str = Depends(get_current_user)) -> dict[str, Any]:
    questions = get_cached_questions(document_id, chunk_id)
    if not questions:
        # We would need to fetch from Postgres. For brevity, assuming cache hit from RAG process.
        # But we should really fetch from DB if miss.
        from ..db import get_connection
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, question, options, answer, difficulty FROM questions WHERE chunk_id = %s", (chunk_id,))
                rows = cur.fetchall()
                questions = [{"id": str(r[0]), "question": r[1], "options": r[2], "answer": r[3], "difficulty": r[4]} for r in rows]
                if questions:
                    from ..cache import set_cached_questions
                    set_cached_questions(document_id, chunk_id, questions)
    
    if not questions:
        return {"questions": []}
    
    # Optional: Filter out questions user already saw using user_question_attempts
    # ...
    
    return {"questions": questions}


@router.post("/quiz/start")
def start_quiz(document_id: str, chunk_id: str, user_id: str = Depends(get_current_user)) -> dict[str, Any]:
    # Fetch questions
    questions_response = fetch_questions(document_id, chunk_id, user_id)
    questions = questions_response.get("questions", [])
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this topic.")
        
    session_id = start_quiz_session(questions)
    return {"session_id": session_id, "question_count": len(questions)}


@router.get("/quiz/{session_id}/next")
def next_question(session_id: str, user_id: str = Depends(get_current_user)) -> dict[str, Any]:
    from ..cache import get_next_question_id
    q_id = get_next_question_id(session_id)
    if not q_id:
        return {"completed": True}
        
    from ..db import get_connection
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, question, options, answer, difficulty FROM questions WHERE id = %s", (q_id,))
            row = cur.fetchone()
            if not row:
                return {"completed": True}
            question = {"id": str(row[0]), "question": row[1], "options": row[2], "answer": row[3], "difficulty": row[4]}
            
    return {"completed": False, "question": question}


@router.post("/quiz/submit")
def submit_answer(
    question_id: str = Query(...), 
    was_correct: bool = Query(...), 
    session_id: str = Query(..., description="The ID of the current quiz session"),
    user_id: str = Depends(get_current_user)
) -> dict[str, Any]:
    from ..db import get_connection
    sql = """
    INSERT INTO user_question_attempts (user_id, question_id, was_correct)
    VALUES (%s, %s, %s)
    ON CONFLICT (user_id, question_id) DO UPDATE SET was_correct = EXCLUDED.was_correct, answered_at = NOW();
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id, question_id, was_correct))
        conn.commit()
    
    # Also record in session for score calculation
    record_session_result(session_id, was_correct)
    
    return {"status": "recorded"}


@router.post("/quiz/{session_id}/complete")
def complete_quiz(session_id: str, user_id: str = Depends(get_current_user)) -> dict[str, Any]:
    results = get_session_results(session_id)
    if not results:
        # Maybe user finished without answering anything or session expired
        return {"score": 0, "correct_count": 0, "total": 0}
        
    correct_count = sum(1 for r in results if r)
    total = len(results)
    # Simple scoring: 10 points per correct answer
    score = correct_count * 10
    
    # Emit event to Kafka for game-service to pick up
    event_data = {
        "userId": user_id,
        "sessionId": session_id,
        "score": score,
        "correctAnswers": correct_count,
        "totalQuestions": total,
        "timestamp": "now" 
    }
    emit_event("game-events", "QUIZ_COMPLETED", event_data)
    
    return {
        "score": score,
        "correct_count": correct_count,
        "total": total
    }
