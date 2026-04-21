from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from ..rag_service import query_documents, stream_query_documents
from ..schemas import QueryRequest
from ..auth import get_current_user

router = APIRouter(prefix="/query", tags=["query"])


@router.post("")
def query_data(payload: QueryRequest, user_id: str = Depends(get_current_user)) -> dict[str, Any]:
    return query_documents(query=payload.query, top_k=payload.top_k, user_id=user_id, room_id=payload.room_id)


@router.post("/stream")
def query_data_stream(payload: QueryRequest, user_id: str = Depends(get_current_user)):
    print("I am streaming")
    return StreamingResponse(
        stream_query_documents(query=payload.query, top_k=payload.top_k, user_id=user_id),
        media_type="application/x-ndjson"
    )
