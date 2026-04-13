from fastapi import FastAPI
from src.api.health import router as health_router
from src.api.ingest import router as ingest_router
from src.api.retrieve import router as retrieve_router

app = FastAPI(title="RAG Service", description="RAG Service", version="0.1.0")

app.include_router(health_router, tags=["health"])
app.include_router(ingest_router, prefix="/rag", tags=["rag"])
app.include_router(retrieve_router, prefix="/rag", tags=["rag"])