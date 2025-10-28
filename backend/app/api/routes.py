from typing import Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.ai import stream_llm

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@router.post("/ai/ask")
def ai_ask(body: ChatRequest):
    def token_stream():
        for chunk in stream_llm([msg.model_dump() for msg in body.messages]):
            yield chunk
    return StreamingResponse(token_stream(), media_type="text/plain")
