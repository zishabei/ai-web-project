import logging
from io import BytesIO
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.services.ai import ask_llm, stream_llm, upload_file_to_vector_store
from app.services.auth import create_user_if_not_exists, verify_user

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


class AuthRequest(BaseModel):
    username: str
    password: str


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


@router.post("/auth/login")
def auth_login(payload: AuthRequest, db: Session = Depends(get_db)):
    user = create_user_if_not_exists(db, payload.username, payload.password)
    if not verify_user(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="用户名或密码不正确")
    return {"token": "dummy-token", "username": user.username}
