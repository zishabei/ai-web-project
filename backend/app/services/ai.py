from typing import Sequence

from app.core.config import settings
from openai import OpenAI, AzureOpenAI


def _client_and_model():
    if settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_DEPLOYMENT:
        return AzureOpenAI(api_key=settings.AZURE_OPENAI_API_KEY, api_version="2024-02-15-preview",
                           azure_endpoint=settings.AZURE_OPENAI_ENDPOINT), settings.AZURE_OPENAI_DEPLOYMENT
    return OpenAI(api_key=settings.OPENAI_API_KEY), "gpt-5"


def ask_llm(messages: Sequence[dict[str, str]]) -> str:
    if not messages:
        raise ValueError("messages must not be empty")
    payload = [{"role": msg["role"], "content": msg["content"]} for msg in messages]
    client, model = _client_and_model()
    resp = client.chat.completions.create(model=model, messages=payload)
    return resp.choices[0].message.content or ""
