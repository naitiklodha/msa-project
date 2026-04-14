from typing import Any

from fastapi import APIRouter

from ..rag_service import query_documents
from ..schemas import QueryRequest

router = APIRouter(prefix="/query", tags=["query"])


@router.post("")
def query_data(payload: QueryRequest) -> dict[str, Any]:
    return query_documents(query=payload.query, top_k=payload.top_k)
