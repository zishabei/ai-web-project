import logging
from collections.abc import Iterable, Sequence
from typing import BinaryIO

from app.core.config import settings
from openai import OpenAI, AzureOpenAI

logger = logging.getLogger(__name__)


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
    vector_store_id = settings.OPENAI_VECTOR_STORE_ID
    if vector_store_id:
        try:
            enriched_messages = [
                {
                    "role": "system",
                    "content": (
                        "你是一名可靠的助理。如果提供了向量知识库，请尽量结合检索到的上下文准确回答。"
                        "若文档找不到答案，也请结合你的一般知识进行回复，而不是只说未找到相关内容。"
                    ),
                },
                *_payload(messages),
            ]
            response = client.responses.create(
                model=model,
                input=enriched_messages,
                tools=[{"type": "file_search", "vector_store_ids": [vector_store_id]}],
            )
            text = response.output_text or ""
            if text.strip():
                tool_outputs: list[str] = []
                for output in getattr(response, "output", []):
                    for item in getattr(output, "content", []):
                        if getattr(item, "type", "") == "tool_call":
                            call_result = getattr(item, "result", None)
                            call_type = getattr(item, "type", "tool_call")
                            tool_outputs.append(
                                f"{call_type}: {call_result or 'no result'}"
                            )
                if tool_outputs:
                    text += "\n\n" + "\n".join(tool_outputs)
                return text
        except Exception as exc:  # pragma: no cover - log and fallback
            logger.exception("Retrieval call failed, falling back to chat completion")
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


def create_vector_store(name: str) -> str:
    client, _ = _client_and_model()
    if not name:
        raise ValueError("Vector store name must not be empty")
    vector_store = client.vector_stores.create(name=name)
    return vector_store.id


def upload_file_to_vector_store(vector_store_id: str, filename: str, file_stream: BinaryIO) -> dict[str, str]:
    client, _ = _client_and_model()
    if not vector_store_id:
        raise ValueError("vector_store_id is required")
    try:
        file_stream.seek(0)
        uploaded_file = client.files.create(
            file=(filename, file_stream.read()),
            purpose="assistants",
        )
        client.vector_stores.file_batches.create_and_poll(
            vector_store_id=vector_store_id,
            file_ids=[uploaded_file.id],
        )
        return {"file_id": uploaded_file.id}
    except Exception as exc:  # pragma: no cover - surface to FastAPI
        raise RuntimeError(f"Failed to upload file: {exc}") from exc
