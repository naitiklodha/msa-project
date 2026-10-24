import os

from dotenv import load_dotenv

load_dotenv()

POSTGRES_URL = os.getenv("POSTGRES_URL")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "models/text-embedding-004")
LLM_MODEL = os.getenv("GEMINI_LLM_MODEL", "gemini-2.0-flash")
VECTOR_DIM = int(os.getenv("EMBEDDING_DIM", "768"))
CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "200"))
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
JWT_SECRET = os.getenv("JWT_SECRET")
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "kafka:9092")

if not POSTGRES_URL:
    raise RuntimeError("POSTGRES_URL is required.")

if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is required.")

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is required.")
