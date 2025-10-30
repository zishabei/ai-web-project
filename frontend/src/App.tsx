import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { askAI, health, type ChatMessage } from "./api";
import "highlight.js/styles/github.css";

const createMessage = (
  role: ChatMessage["role"],
  content: string,
): ChatMessage => ({ role, content });

const MARKDOWN_CLASS =
  "prose prose-slate max-w-none prose-pre:rounded-xl prose-pre:bg-slate-950 prose-pre:text-slate-100 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-strong:font-semibold prose-blockquote:border-l-4 prose-blockquote:border-slate-200 prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:px-4";

export default function App() {
  const [status, setStatus] = useState("checking...");
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "assistant",
      "你好！👋\n欢迎回来～今天想聊点什么？是要继续昨天的项目问题，还是有新的计划？",
    ),
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const initialRender = useRef(true);

  useEffect(() => {
    health()
      .then((res) => setStatus(res.status ?? "ok"))
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
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
    if (event.key === "Enter" && !event.shiftKey && !isComposing) {
      event.preventDefault();
      submit();
    }
  };
  return (
    <div className="flex h-dvh min-h-0 flex-col bg-[#666666] text-slate-900">

      <header className="shrink-0 border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between px-4">
          <div className="text-sm text-slate-600">
            后端：<span className="font-mono text-emerald-600">{status}</span>
          </div>
          <div className="text-sm text-slate-500">Simple Chat</div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-8">
          <div className="space-y-6">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={index}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[90%] flex-col gap-3 ${isUser ? "items-end" : "items-start"
                      }`}
                  >
                    <div
                      className={`rounded-3xl px-5 py-4 text-base leading-7 shadow-sm ${
                        isUser
                          ? "bg-[#f1f2f4] text-slate-900"
                          : "bg-white text-slate-900"
                      }`}
                    >
                      <div className={MARKDOWN_CLASS}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>
      </main>

      {/* 底部：输入框 —— 正常流中的底栏，不悬浮 */}
      <footer className="shrink-0 border-t border-slate-200 bg-white/90">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <textarea
              className="max-h-48 min-h-[44px] flex-1 resize-none bg-transparent text-base placeholder:text-slate-400 focus:outline-none"
              placeholder="输入内容（Enter 发送，Shift+Enter 换行）"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b8bff] text-white transition hover:bg-[#0073e6] disabled:bg-slate-300 disabled:cursor-not-allowed"
              title="发送"
            >
              ➤
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
