from typing import Any

from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    source: str | None = None
    content: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class QueryRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    room_id: str | None = None
