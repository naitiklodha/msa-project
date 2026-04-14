import json
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from ..chunking import chunk_text
from ..file_processing import extract_text_from_file
from ..rag_service import ingest_content, list_documents, summarize_text, update_document
from ..schemas import IngestRequest, UpdateIngestRequest

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/ingest")
def ingest_text(payload: IngestRequest) -> dict[str, Any]:
    chunks = chunk_text(payload.content)
    return ingest_content(
        source=payload.source,
        content=payload.content,
        metadata=payload.metadata,
        chunks=chunks,
    )


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    source: str | None = Form(default=None),
    metadata: str = Form(default="{}"),
) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    raw_bytes = await file.read()
    text, ext = extract_text_from_file(file.filename, raw_bytes)

    try:
        metadata_dict = json.loads(metadata)
        if not isinstance(metadata_dict, dict):
            raise ValueError("metadata must be a JSON object")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid metadata JSON: {exc}") from exc

    normalized_source = source or file.filename
    metadata_dict = dict(metadata_dict)
    metadata_dict.update({"file_name": file.filename, "file_type": ext})
    chunks = chunk_text(text)
    ingest_result = ingest_content(
        source=normalized_source,
        content=text,
        metadata=metadata_dict,
        chunks=chunks,
    )
    summary_result = summarize_text(text)

    return {
        "file_name": file.filename,
        "file_type": ext,
        "content_length": len(text),
        "summary": summary_result["summary"],
        "ingest_result": ingest_result,
    }


@router.post("/upload/summary")
async def upload_document_summary(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    raw_bytes = await file.read()
    text, ext = extract_text_from_file(file.filename, raw_bytes)
    summary_result = summarize_text(text)

    return {
        "file_name": file.filename,
        "file_type": ext,
        "content_length": len(text),
        "summary": summary_result["summary"],
    }


@router.put("/{document_id}")
def update_ingested_data(document_id: str, payload: UpdateIngestRequest) -> dict[str, Any]:
    result = update_document(
        document_id=document_id,
        source=payload.source,
        content=payload.content,
        metadata=payload.metadata,
    )
    if result["document"] is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return result


@router.get("")
def get_documents(limit: int = Query(default=20, ge=1, le=100)) -> dict[str, Any]:
    return list_documents(limit=limit)
