import json
import logging
from typing import Any, Optional
import redis
from .config import REDIS_URL

logger = logging.getLogger(__name__)

# Initialize Redis client
# Setting decode_responses=True so that strings are returned instead of bytes
try:
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
except Exception as e:
    logger.error(f"Failed to initialize Redis client: {e}")
    redis_client = None


def get_cached_document_id(doc_hash: str) -> Optional[str]:
    if not redis_client:
        return None
    try:
        return redis_client.get(f"doc:{doc_hash}:exists")
    except Exception as e:
        logger.error(f"Redis get error (exists): {e}")
        return None


def set_cached_document_id(doc_hash: str, doc_id: str) -> None:
    if not redis_client:
        return
    try:
        redis_client.setex(f"doc:{doc_hash}:exists", 86400, doc_id) # 24h
    except Exception as e:
        logger.error(f"Redis set error (exists): {e}")


def get_cached_topics(doc_id: str) -> Optional[dict[str, Any]]:
    if not redis_client:
        return None
    try:
        cached = redis_client.get(f"doc:{doc_id}:topics")
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.error(f"Redis get error (topics): {e}")
    return None


def set_cached_topics(doc_id: str, topics_data: dict[str, Any]) -> None:
    if not redis_client:
        return
    try:
        redis_client.setex(f"doc:{doc_id}:topics", 3600, json.dumps(topics_data)) # 1h
    except Exception as e:
        logger.error(f"Redis set error (topics): {e}")


def get_cached_questions(doc_id: str, chunk_id: str) -> Optional[list[dict[str, Any]]]:
    if not redis_client:
        return None
    try:
        cached = redis_client.get(f"doc:{doc_id}:questions:{chunk_id}")
        if cached:
            return json.loads(cached)
    except Exception as e:
        logger.error(f"Redis get error (questions): {e}")
    return None


def set_cached_questions(doc_id: str, chunk_id: str, questions: list[dict[str, Any]]) -> None:
    if not redis_client:
        return
    try:
        redis_client.setex(f"doc:{doc_id}:questions:{chunk_id}", 3600, json.dumps(questions)) # 1h
    except Exception as e:
        logger.error(f"Redis set error (questions): {e}")


def start_quiz_session(questions: list[dict[str, Any]]) -> str:
    import uuid
    session_id = str(uuid.uuid4())
    if not redis_client:
        return session_id
    try:
        session_key = f"session:{session_id}:queue"
        q_ids = [q["id"] for q in questions]
        if q_ids:
            redis_client.rpush(session_key, *q_ids)
            redis_client.expire(session_key, 1800)  # 30 min TTL
    except Exception as e:
        logger.error(f"Redis error (start session): {e}")
    return session_id


def get_next_question_id(session_id: str) -> Optional[str]:
    if not redis_client:
        return None
    try:
        session_key = f"session:{session_id}:queue"
        q_id = redis_client.lpop(session_key)
        return q_id
    except Exception as e:
        logger.error(f"Redis error (next question): {e}")
        return None


def record_session_result(session_id: str, is_correct: bool) -> None:
    if not redis_client:
        return
    try:
        results_key = f"session:{session_id}:results"
        redis_client.rpush(results_key, "1" if is_correct else "0")
        redis_client.expire(results_key, 1800)
    except Exception as e:
        logger.error(f"Redis error (record result): {e}")


def get_session_results(session_id: str) -> list[bool]:
    if not redis_client:
        return []
    try:
        results_key = f"session:{session_id}:results"
        items = redis_client.lrange(results_key, 0, -1)
        return [item == "1" for item in items]
    except Exception as e:
        logger.error(f"Redis error (get results): {e}")
        return []


def invalidate_document_cache(doc_id: str) -> None:
    if not redis_client:
        return
    try:
        keys = redis_client.keys(f"doc:{doc_id}:*")
        if keys:
            redis_client.delete(*keys)
    except Exception as e:
        logger.error(f"Redis delete error: {e}")
