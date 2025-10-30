import logging
from io import BytesIO
from typing import Literal

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import settings
from app.services.ai import (
    ask_llm,
    create_vector_store,
    stream_llm,
    upload_file_to_vector_store,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class VectorStoreCreateIn(BaseModel):
    name: str


@router.post("/ai/ask")
def ai_ask(body: ChatRequest):
    def token_stream():
        messages = [msg.model_dump() for msg in body.messages]
        if settings.OPENAI_VECTOR_STORE_ID:
            yield ask_llm(messages)
            return
        for chunk in stream_llm(messages):
            yield chunk
    return StreamingResponse(token_stream(), media_type="text/plain")


@router.post("/kb/vector-stores")
def kb_create_vector_store(payload: VectorStoreCreateIn):
    try:
        vector_store_id = create_vector_store(payload.name)
        return {"id": vector_store_id, "name": payload.name}
    except Exception as exc:
        logger.exception("Failed to create vector store")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/kb/vector-stores/{vector_store_id}/files")
async def kb_upload_file(vector_store_id: str, file: UploadFile = File(...)):
    data = await file.read()
    try:
        result = upload_file_to_vector_store(
            vector_store_id,
            file.filename,
            file_stream=BytesIO(data),
        )
        return {"vector_store_id": vector_store_id, **result}
    except Exception as exc:
        logger.exception("Failed to upload file to vector store")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
