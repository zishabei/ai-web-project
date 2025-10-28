from collections.abc import Iterable, Sequence

from app.core.config import settings
from openai import OpenAI, AzureOpenAI


def _client_and_model():
    if settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_DEPLOYMENT:
        return AzureOpenAI(api_key=settings.AZURE_OPENAI_API_KEY, api_version="2024-02-15-preview",
                           azure_endpoint=settings.AZURE_OPENAI_ENDPOINT), settings.AZURE_OPENAI_DEPLOYMENT
    return OpenAI(api_key=settings.OPENAI_API_KEY), "gpt-4o-mini"


def _payload(messages: Sequence[dict[str, str]]) -> list[dict[str, str]]:
    if not messages:
        raise ValueError("messages must not be empty")
    return [{"role": msg["role"], "content": msg["content"]} for msg in messages]


def ask_llm(messages: Sequence[dict[str, str]]) -> str:
    client, model = _client_and_model()
    resp = client.chat.completions.create(model=model, messages=_payload(messages))
    return resp.choices[0].message.content or ""


def stream_llm(messages: Sequence[dict[str, str]]) -> Iterable[str]:
    client, model = _client_and_model()
    stream = client.chat.completions.create(model=model, messages=_payload(messages), stream=True)
    for chunk in stream:
        choice = chunk.choices[0]
        delta = getattr(choice, "delta", None)
        content = getattr(delta, "content", None)
        if content:
            yield content
