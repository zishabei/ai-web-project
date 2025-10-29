import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { askAI, health, type ChatMessage } from "./api";

const createMessage = (
  role: ChatMessage["role"],
  content: string,
): ChatMessage => ({ role, content });

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatInline = (text: string) => {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>',
    );
};

type ListState = {
  type: "ul" | "ol";
  items: string[];
};

const flushList = (list: ListState | null, html: string[]) => {
  if (!list || list.items.length === 0) return;
  const tag = list.type;
  const cls =
    tag === "ul"
      ? "list-disc pl-5 space-y-1"
      : "list-decimal pl-5 space-y-1";
  html.push(
    `<${tag} class="${cls}">${tag === "ol"
      ? list.items
        .map((item, index) => `<li value="${index + 1}">${formatInline(item)}</li>`)
        .join("")
      : list.items.map((item) => `<li>${formatInline(item)}</li>`).join("")
    }</${tag}>`,
  );
  list.items = [];
};

const flushBlockquote = (buffer: string[], html: string[]) => {
  if (!buffer.length) return;
  const content = buffer
    .map((line) => `<p>${formatInline(line)}</p>`)
    .join("");
  html.push(
    `<blockquote class="border-l-4 border-slate-300 bg-slate-50 px-4 py-2 italic text-slate-700">${content}</blockquote>`,
  );
  buffer.length = 0;
};

const formatRichText = (markdown: string) => {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = "";
  let listState: ListState | null = null;
  const blockquoteBuffer: string[] = [];

  const flushCode = () => {
    if (!codeBuffer.length) return;
    const codeClass = codeLanguage
      ? ` class="language-${escapeHtml(codeLanguage)}"`
      : "";
    html.push(
      `<pre class="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto"><code${codeClass}>${escapeHtml(
        codeBuffer.join("\n"),
      )}</code></pre>`,
    );
    codeBuffer = [];
    codeLanguage = "";
  };

  const resetLists = () => {
    if (listState) {
      flushList(listState, html);
      listState = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (trimmed.startsWith("```")) {
      flushBlockquote(blockquoteBuffer, html);
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        resetLists();
        inCodeBlock = true;
        codeBuffer = [];
        codeLanguage = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (!trimmed.trim()) {
      resetLists();
      flushBlockquote(blockquoteBuffer, html);
      html.push('<p class="my-2"></p>');
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      resetLists();
      flushBlockquote(blockquoteBuffer, html);
      const level = headingMatch[1].length;
      const content = headingMatch[2].trim();
      const sizeClass =
        level === 1
          ? "text-3xl font-bold"
          : level === 2
            ? "text-2xl font-semibold"
            : level === 3
              ? "text-xl font-semibold"
              : "text-lg font-semibold";
      html.push(
        `<h${level} class="${sizeClass} mt-4 mb-2">${formatInline(
          content,
        )}</h${level}>`,
      );
      continue;
    }

    if (/^>+\s?/.test(trimmed)) {
      resetLists();
      const content = trimmed.replace(/^>+\s?/, "");
      blockquoteBuffer.push(content);
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      flushBlockquote(blockquoteBuffer, html);
      if (!listState) {
        listState = { type: "ul", items: [] };
      } else if (listState.type !== "ul") {
        flushList(listState, html);
        listState = { type: "ul", items: [] };
      }
      listState.items.push(trimmed.replace(/^[-*+]\s+/, ""));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushBlockquote(blockquoteBuffer, html);
      if (!listState) {
        listState = { type: "ol", items: [] };
      } else if (listState.type !== "ol") {
        flushList(listState, html);
        listState = { type: "ol", items: [] };
      }
      listState.items.push(trimmed.replace(/^\d+\.\s+/, ""));
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      resetLists();
      flushBlockquote(blockquoteBuffer, html);
      html.push('<hr class="my-4 border-slate-200" />');
      continue;
    }

    resetLists();
    flushBlockquote(blockquoteBuffer, html);
    html.push(`<p class="leading-7">${formatInline(trimmed)}</p>`);
  }

  resetLists();
  flushBlockquote(blockquoteBuffer, html);
  if (inCodeBlock) {
    flushCode();
  }

  return html.join("");
};

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
      {/* 顶部栏（可选） */}
      <header className="shrink-0 border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between px-4">
          <div className="text-sm text-slate-600">
            后端：<span className="font-mono text-emerald-600">{status}</span>
          </div>
          <div className="text-sm text-slate-500">Simple Chat</div>
        </div>
      </header>

      {/* 中间：聊天内容 —— 独立滚动 */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-8">
          {/* 你的 messages 渲染保持不变 */}
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
                      className={`rounded-3xl px-5 py-4 text-base leading-7 shadow-sm ${isUser
                        ? "bg-[#f1f2f4] text-slate-900"
                        : "bg-white text-slate-900"
                        }`}
                    >
                      <div
                        className="space-y-3 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100 [&_strong]:font-semibold"
                        dangerouslySetInnerHTML={{
                          __html: formatRichText(message.content),
                        }}
                      />
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
