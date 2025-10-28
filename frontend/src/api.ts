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

export async function askAI(messages: ChatMessage[]): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE}/ai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) {
    throw new Error("request failed");
  }
  const data = await response.json();
  return data.message as ChatMessage;
}
