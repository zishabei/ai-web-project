from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai import ask_llm

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    message: ChatMessage


@router.post("/ai/ask", response_model=ChatResponse)
def ai_ask(body: ChatRequest):
    reply = ask_llm([msg.model_dump() for msg in body.messages])
    return {"message": {"role": "assistant", "content": reply}}
