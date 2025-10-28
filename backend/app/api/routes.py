from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai import ask_llm
router = APIRouter()
@router.get("/health")
def health(): return {"status":"ok"}
class AskIn(BaseModel): prompt: str
@router.post("/ai/ask")
def ai_ask(body: AskIn): return {"text": ask_llm(body.prompt)}
