import os

from dotenv import load_dotenv

load_dotenv()

POSTGRES_URL = os.getenv("POSTGRES_URL")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "models/gemini-embedding-001")
LLM_MODEL = os.getenv("GEMINI_LLM_MODEL", "models/gemini-2.5-pro")
VECTOR_DIM = int(os.getenv("EMBEDDING_DIM", "768"))
CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "200"))
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

if not POSTGRES_URL:
    raise RuntimeError("POSTGRES_URL is required.")

if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is required.")
