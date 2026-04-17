import json
import logging
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from ..chunking import chunk_text
from ..file_processing import extract_text_from_file
from ..quiz_service import generate_questions
from ..rag_service import ingest_content, list_documents, summarize_text, update_document
from ..schemas import IngestRequest, UpdateIngestRequest

logger = logging.getLogger(__name__)

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
    logger.info("Starting upload for file: %s", file.filename)
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    raw_bytes = await file.read()
    logger.info("Read %d bytes from file", len(raw_bytes))
    text, ext = extract_text_from_file(file.filename, raw_bytes)
    logger.info("Extracted text of length %d, type: %s", len(text), ext)

    try:
        metadata_dict = json.loads(metadata)
        if not isinstance(metadata_dict, dict):
            raise ValueError("metadata must be a JSON object")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid metadata JSON: {exc}") from exc

    normalized_source = source or file.filename
    metadata_dict = dict(metadata_dict)
    metadata_dict.update({"file_name": file.filename, "file_type": ext})
    
    logger.info("Generating topic division")
    topic_division = summarize_text(text)
    
    if topic_division.get("number_of_parts", 1) == 1:
        logger.info("Single part document, ingesting as one")
        # Single part, ingest as usual
        chunks = chunk_text(text)
        ingest_result = ingest_content(
            source=normalized_source,
            content=text,
            metadata=metadata_dict,
            chunks=chunks,
        )
        return {
            "file_name": file.filename,
            "file_type": ext,
            "content_length": len(text),
            "topic_division": topic_division,
            "ingest_result": ingest_result,
        }
    else:
        logger.info("Multiple parts (%d), ingesting each as separate document", topic_division["number_of_parts"])
        # Multiple parts, ingest each as separate document
        ingest_results = []
        for i, part in enumerate(topic_division.get("parts", [])):
            part_content = f"{part['title']}\n\n{part['outline']}"
            part_metadata = dict(metadata_dict)
            part_metadata.update({
                "part_index": i,
                "part_title": part["title"],
                "time_minutes": part["time_minutes"],
                "total_parts": topic_division["number_of_parts"]
            })
            chunks = chunk_text(part_content)
            result = ingest_content(
                source=f"{normalized_source} - Part {i+1}: {part['title']}",
                content=part_content,
                metadata=part_metadata,
                chunks=chunks,
            )
            ingest_results.append(result)
        
        return {
            "file_name": file.filename,
            "file_type": ext,
            "content_length": len(text),
            "topic_division": topic_division,
            "ingest_results": ingest_results,
        }


@router.post("/upload/summary")
async def upload_document_summary(file: UploadFile = File(...)) -> dict[str, Any]:
    logger.info("Starting breakdown for file: %s", file.filename)
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    raw_bytes = await file.read()
    logger.info("Read %d bytes from file", len(raw_bytes))
    text, ext = extract_text_from_file(file.filename, raw_bytes)
    logger.info("Extracted text of length %d, type: %s", len(text), ext)
    topic_division = summarize_text(text)

    return {
        "file_name": file.filename,
        "file_type": ext,
        "content_length": len(text),
        "summary": topic_division,
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


@router.post("/generate-questions")
def generate_part_questions(part_content: str, part_title: str) -> dict[str, Any]:
    logger.info("Generating questions for part: %s", part_title)
    questions = generate_questions(part_content, part_title)
    return {"part_title": part_title, "questions": questions}


@router.post("/upload/breakdown-with-questions")
async def upload_with_questions(file: UploadFile = File(...)) -> dict[str, Any]:
    """
    Upload a document and get both topic breakdown AND questions for each part.
    This combines the topic division with question generation for complete study material.
    """
    logger.info("Starting breakdown with questions for file: %s", file.filename)
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    raw_bytes = await file.read()
    logger.info("Read %d bytes from file", len(raw_bytes))
    text, ext = extract_text_from_file(file.filename, raw_bytes)
    logger.info("Extracted text of length %d, type: %s", len(text), ext)
    
    logger.info("Generating topic division")
    topic_division = summarize_text(text)
    
    logger.info("Generating questions for each part")
    parts_with_questions = []
    for i, part in enumerate(topic_division.get("parts", [])):
        logger.info("Processing part %d: %s", i + 1, part["title"])
        
        # Generate questions for this part's outline
        questions = generate_questions(part["outline"], part["title"])
        
        part_with_questions = {
            "part_number": i + 1,
            "title": part["title"],
            "time_minutes": part["time_minutes"],
            "outline": part["outline"],
            "questions": questions
        }
        parts_with_questions.append(part_with_questions)
    
    return {
        "file_name": file.filename,
        "file_type": ext,
        "content_length": len(text),
        "number_of_parts": topic_division.get("number_of_parts", 0),
        "parts": parts_with_questions,
    }
