from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
app = FastAPI(title="AI Web Backend")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api")
# 启动: uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
