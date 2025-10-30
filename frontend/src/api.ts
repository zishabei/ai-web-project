export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface RetrievalToolCall {
  type: string;
  result?: string;
}

export interface AskAIResponse {
  message: ChatMessage;
  tool_calls?: RetrievalToolCall[];
}

export async function health() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error("health check failed");
  }
  return response.json();
}

export async function askAI(
  messages: ChatMessage[],
  onChunk?: (chunk: string) => void,
): Promise<AskAIResponse> {
  const response = await fetch(`${API_BASE}/ai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "request failed");
  }
  if (!response.body) {
    throw new Error("ReadableStream not supported in this browser");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      full += chunk;
      onChunk?.(chunk);
    }
  }
  try {
    const parsed = JSON.parse(full) as AskAIResponse;
    if (parsed && parsed.message) {
      return parsed;
    }
  } catch {
    // fall through to text response
  }
  return {
    message: { role: "assistant", content: full },
  };
}

export async function createVectorStore(name: string) {
  const response = await fetch(`${API_BASE}/kb/vector-stores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const data = await response.json();
  console.info("Vector store created:", data);
  return data;
}

export async function uploadKnowledgeFile(vectorStoreId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `${API_BASE}/kb/vector-stores/${vectorStoreId}/files`,
    { method: "POST", body: formData },
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}
