import os

from dotenv import load_dotenv

load_dotenv()

POSTGRES_URL = os.getenv("POSTGRES_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
LLM_MODEL = os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini")
VECTOR_DIM = int(os.getenv("EMBEDDING_DIM", "1536"))
CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "200"))
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
JWT_SECRET = os.getenv("JWT_SECRET")
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "kafka:9092")

if not POSTGRES_URL:
    raise RuntimeError("POSTGRES_URL is required.")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is required.")

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is required.")
