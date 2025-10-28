import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { askAI, health, type ChatMessage } from "./api";

const createMessage = (
  role: ChatMessage["role"],
  content: string,
): ChatMessage => ({ role, content });

export default function App() {
  const [status, setStatus] = useState("checking...");
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage("assistant", "你好！我是你的 AI 助理，有什么可以帮忙的吗？"),
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    health()
      .then((res) => setStatus(res.status ?? "ok"))
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async () => {
    const content = input.trim();
    if (!content || loading) return;
    const userMessage = createMessage("user", content);
    const nextMessages = [...messages, userMessage];
    const assistantPlaceholder = createMessage("assistant", "");
    setMessages([...nextMessages, assistantPlaceholder]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      let aggregated = "";
      const reply = await askAI(nextMessages, (chunk) => {
        aggregated += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
            updated[lastIndex] = createMessage("assistant", aggregated);
          }
          return updated;
        });
      });
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
          updated[lastIndex] = reply;
        } else {
          updated.push(reply);
        }
        return updated;
      });
    } catch (err) {
      const fallback = "抱歉，请稍后重试或检查后端日志。";
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        const assistant = createMessage("assistant", fallback);
        if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
          updated[lastIndex] = assistant;
        } else {
          updated.push(assistant);
        }
        return updated;
      });
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">AI 助理</h1>
          <div className="text-sm text-slate-500">
            后端健康：<span className="font-mono text-slate-700">{status}</span>
          </div>
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              请求失败：{error}
            </div>
          )}
        </header>

        <main className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </main>

        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
        >
          <textarea
            className="min-h-[80px] w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="请输入你的问题，Shift+Enter 换行，Enter 发送。"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {loading ? "AI 正在思考..." : "准备就绪"}
            </span>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? "发送中..." : "发送"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
