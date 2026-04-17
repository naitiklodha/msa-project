from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..rag_service import query_documents, stream_query_documents
from ..schemas import QueryRequest

router = APIRouter(prefix="/query", tags=["query"])


@router.post("")
def query_data(payload: QueryRequest) -> dict[str, Any]:
    return query_documents(query=payload.query, top_k=payload.top_k)


@router.post("/stream")
def query_data_stream(payload: QueryRequest):
    return StreamingResponse(
        stream_query_documents(query=payload.query, top_k=payload.top_k),
        media_type="application/x-ndjson"
    )
