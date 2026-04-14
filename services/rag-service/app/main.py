from contextlib import asynccontextmanager

from fastapi import FastAPI

from .db import init_db
from .routers.documents import router as documents_router
from .routers.health import router as health_router
from .routers.query import router as query_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="RAG Service", version="1.0.0", lifespan=lifespan)
app.include_router(health_router)
app.include_router(documents_router)
app.include_router(query_router)
