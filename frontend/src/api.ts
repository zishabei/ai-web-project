export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
): Promise<ChatMessage> {
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
  return { role: "assistant", content: full };
}
