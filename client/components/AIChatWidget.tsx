"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

type NavSuggestion = {
  path: string;
  query?: Record<string, string>;
  label: string;
};

type ToolCall = {
  id: string;
  name: string;
  input?: Record<string, unknown>;
  status: "running" | "done" | "error";
  preview?: string;
  navigation?: NavSuggestion;
};

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolCalls: ToolCall[];
  navigations: NavSuggestion[];
  images?: string[]; // data URLs of images sent with this message (for display)
  ts: number;
};

type Att = {
  id: string;
  kind: "image" | "pdf" | "text" | "unsupported";
  name: string;
  dataUrl?: string;
  text?: string;
};

const TEXT_EXTS = [".txt", ".md", ".csv", ".json", ".log", ".html", ".rtf"];
function readAs(file: File, mode: "dataURL" | "text"): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    if (mode === "dataURL") r.readAsDataURL(file);
    else r.readAsText(file);
  });
}

const STORAGE_KEY = "avs-ai-chat-thread";

export default function AIChatWidget({
  variant = "float",
}: {
  variant?: "float" | "page";
}) {
  const { isAuthenticated, isHydrated, currentUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPage = variant === "page";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [atts, setAtts] = useState<Att[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load conversation from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setMessages(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Persist conversation.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (messages.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll on new content.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  // Open when the sidebar "Fikermenpiken" link is clicked.
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("open-fikermenpiken", openIt);
    return () => window.removeEventListener("open-fikermenpiken", openIt);
  }, []);

  // Hide on login route or pre-hydration / unauthenticated.
  if (!isHydrated || !isAuthenticated || pathname === "/login") return null;

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const next: Att[] = [];
    for (const f of Array.from(list)) {
      if (f.size > 12 * 1024 * 1024) {
        next.push({ id: crypto.randomUUID(), kind: "unsupported", name: f.name + " (too big, max 12MB)" });
        continue;
      }
      if (f.type.startsWith("image/")) {
        next.push({ id: crypto.randomUUID(), kind: "image", name: f.name, dataUrl: await readAs(f, "dataURL") });
      } else if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        next.push({ id: crypto.randomUUID(), kind: "pdf", name: f.name, dataUrl: await readAs(f, "dataURL") });
      } else if (f.type.startsWith("text/") || TEXT_EXTS.some((e) => f.name.toLowerCase().endsWith(e))) {
        next.push({ id: crypto.randomUUID(), kind: "text", name: f.name, text: (await readAs(f, "text")).slice(0, 100000) });
      } else {
        next.push({ id: crypto.randomUUID(), kind: "unsupported", name: f.name + " (unsupported)" });
      }
    }
    setAtts((prev) => [...prev, ...next]);
  }
  const removeAtt = (id: string) => setAtts((prev) => prev.filter((a) => a.id !== id));

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imgs: File[] = [];
    for (const it of Array.from(e.clipboardData?.items ?? [])) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) imgs.push(f);
      }
    }
    if (imgs.length) {
      e.preventDefault();
      const dt = new DataTransfer();
      imgs.forEach((f) =>
        dt.items.add(new File([f], f.name && f.name !== "image.png" ? f.name : `pasted-${Date.now()}.png`, { type: f.type })),
      );
      void addFiles(dt.files);
    }
  }

  async function send() {
    const text = input.trim();
    const sendAtts = atts.filter((a) => a.kind !== "unsupported");
    if ((!text && sendAtts.length === 0) || sending) return;
    setError(null);

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      toolCalls: [],
      navigations: [],
      images: sendAtts.filter((a) => a.kind === "image" && a.dataUrl).map((a) => a.dataUrl as string),
      ts: Date.now(),
    };
    const assistantMsg: Msg = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: "",
      toolCalls: [],
      navigations: [],
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setAtts([]);
    setSending(true);

    // Build the request payload — strip our local UI fields.
    const history = [
      ...messages.filter((m) => m.role === "user" || (m.role === "assistant" && m.text)),
      userMsg,
    ].map((m) => ({ role: m.role, content: m.text || "(see attachment)" }));

    const attachments = sendAtts.map((a) => ({
      kind: a.kind,
      name: a.name,
      dataUrl: a.dataUrl,
      text: a.text,
    }));

    abortRef.current = new AbortController();
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, attachments }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(errText.slice(0, 200));
      }

      await consumeSse(res.body, (event) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last || last.id !== assistantMsg.id) return prev;
          // Immutable update: clone the message (and the arrays we touch) instead of
          // mutating it in place. React StrictMode runs this updater twice in dev —
          // mutating `last` doubled the streamed text. Cloning keeps it pure & idempotent.
          const updated: Msg = {
            ...last,
            toolCalls: last.toolCalls.map((t) => ({ ...t })),
            navigations: [...last.navigations],
          };
          switch (event.type) {
            case "text": {
              updated.text = last.text + event.data.delta;
              break;
            }
            case "tool_use_start": {
              updated.toolCalls = [
                ...updated.toolCalls,
                { id: event.data.id, name: event.data.name, status: "running" },
              ];
              break;
            }
            case "tool_result": {
              const tc = updated.toolCalls.find((t) => t.id === event.data.id);
              if (tc) {
                tc.status = event.data.error ? "error" : "done";
                if (event.data.result?.navigation) {
                  tc.navigation = event.data.result.navigation;
                  updated.navigations = [...updated.navigations, event.data.result.navigation];
                } else if (event.data.result && event.data.name) {
                  tc.preview = summariseResult(event.data.name, event.data.result);
                }
              }
              break;
            }
            case "error": {
              setError(event.data.message);
              break;
            }
          }
          return [...prev.slice(0, -1), updated];
        });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("aborted")) {
        setError(msg);
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function clear() {
    if (sending) abortRef.current?.abort();
    setMessages([]);
    setError(null);
  }

  function openNav(nav: NavSuggestion) {
    const params = new URLSearchParams(nav.query || {});
    const qs = params.toString();
    router.push(nav.path + (qs ? `?${qs}` : ""));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Floating mode shows a launcher bubble first. Page mode is always open.
  if (!isPage && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[9999] bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-full shadow-2xl shadow-emerald-900/30 px-4 py-3 flex items-center gap-2 transition-all border border-white/20 group"
        aria-label="Open AI assistant"
      >
        <span className="text-lg">✨</span>
        <span className="text-sm font-semibold">AI assistant</span>
        {messages.length > 0 && (
          <span className="bg-white/25 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {messages.filter((m) => m.role === "user").length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={
        isPage
          ? "h-full w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden"
          : "fixed bottom-5 right-5 z-[9999] w-[420px] max-w-[calc(100vw-2rem)] h-[640px] max-h-[calc(100vh-2rem)] bg-slate-950 text-slate-100 rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
      }
    >
      <header className="px-4 py-3 border-b border-white/10 flex items-center gap-3 bg-gradient-to-r from-slate-900 to-emerald-950/50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-900 font-black">
          ✨
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Fikermenpiken</div>
          <div className="text-[10px] text-slate-400">
            Hi {currentUser?.name.split(" ")[0]} · live Notion + dashboard access
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded border border-white/10 hover:bg-white/5"
            title="Clear chat"
          >
            Clear
          </button>
        )}
        {!isPage && (
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white text-lg leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-white/5"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className={`mx-auto ${isPage ? "max-w-2xl mt-6" : "max-w-xs mt-4"} space-y-5`}>
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-3xl shadow-lg shadow-emerald-900/30">
                ✨
              </div>
              <div className="text-lg font-bold text-white">
                Hey {currentUser?.name.split(" ")[0] || "there"} 👋 I&apos;m Fikermenpiken
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your AI business co-partner for AVS. I know your properties and pipeline, and I&apos;m here to
                take the busywork off your plate — quick, sharp, and on your side.
              </p>
            </div>

            <div className={`grid ${isPage ? "grid-cols-2" : "grid-cols-1"} gap-2 text-left`}>
              {[
                { icon: "📣", t: "Ads", d: "Google & Facebook ad copy, keywords, targeting" },
                { icon: "🤝", t: "Landlord outreach", d: "Draft + one-tap WhatsApp/email to chase deals" },
                { icon: "📄", t: "Documents", d: "Proposals, letters, contracts, summaries" },
                { icon: "🔎", t: "Research", d: "Areas, competitors, market — done fast" },
              ].map((c) => (
                <div key={c.t} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                  <div className="text-sm font-semibold text-emerald-200">{c.icon} {c.t}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{c.d}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 px-1">Try one</div>
              <div className={`grid ${isPage ? "grid-cols-2" : "grid-cols-1"} gap-1.5`}>
                {[
                  "Draft 3 Google Ads headlines for property sourcing",
                  "Write a WhatsApp to chase a landlord in my pipeline",
                  "What's overdue in my pipeline?",
                  "Draft a property management proposal",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-left text-xs bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-white/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} onNavClick={openNav} sending={sending && m.role === "assistant" && m === messages[messages.length - 1]} />
        ))}

        {error && (
          <div className="bg-rose-900/40 border border-rose-700/50 text-rose-200 text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-3 space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.pdf,.txt,.md,.csv,.json,.log,.html"
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {atts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {atts.map((a) => (
              <div
                key={a.id}
                className={`group relative flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                  a.kind === "unsupported"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                    : "border-white/10 bg-white/5 text-slate-200"
                }`}
              >
                {a.kind === "image" && a.dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.dataUrl} alt={a.name} className="h-7 w-7 rounded object-cover" />
                ) : (
                  <span>{a.kind === "pdf" ? "📕" : a.kind === "text" ? "📄" : "⚠️"}</span>
                )}
                <span className="max-w-[140px] truncate">{a.name}</span>
                <button onClick={() => removeAtt(a.id)} className="text-slate-400 hover:text-rose-300" aria-label="Remove">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end bg-white/5 border border-white/10 rounded-xl p-2 focus-within:border-emerald-500/50 transition-colors">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            title="Attach image, PDF or file"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            📎
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={handlePaste}
            rows={1}
            placeholder="Ask anything… or paste a screenshot"
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder:text-slate-500 max-h-32"
            disabled={sending}
          />
          {sending ? (
            <button
              onClick={stop}
              className="shrink-0 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim() && atts.filter((a) => a.kind !== "unsupported").length === 0}
              className="shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              Send ⇧
            </button>
          )}
        </div>
        <div className="text-[10px] text-slate-500 px-1">
          📎 Attach images, PDFs &amp; files · paste screenshots · Enter to send
        </div>
      </div>
    </div>
  );
}

// Strip raw tool-call artifacts some models leak into text (e.g. <function=...>{...}</function>).
function cleanText(t: string): string {
  return (t || "")
    .replace(/<function[^>]*>[\s\S]*?<\/function>/gi, "")
    .replace(/<\/?function[^>]*>/gi, "")
    .replace(/<\|[^|]*\|>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

// Turn URLs in the assistant's text into clickable links — and WhatsApp / email /
// phone links into one-tap action buttons (so Fikermenpiken can "send" for Nathan).
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+|mailto:[^\s)<]+|tel:[^\s)<]+)/gi);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        const isLink = /^(https?:\/\/|mailto:|tel:)/i.test(part);
        if (!isLink) return <span key={i}>{part}</span>;
        const low = part.toLowerCase();
        const wa = low.includes("wa.me") || low.includes("api.whatsapp.com");
        const mail = low.startsWith("mailto:");
        const tel = low.startsWith("tel:");
        if (wa || mail || tel) {
          const label = wa ? "📱 Send on WhatsApp" : mail ? "✉️ Open email" : "📞 Call";
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 my-1 mr-1 px-2.5 py-1 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-100 text-xs font-semibold hover:bg-emerald-600/50 transition-colors"
            >
              {label}
            </a>
          );
        }
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline break-all">
            {part}
          </a>
        );
      })}
    </>
  );
}

function MessageBubble({
  msg,
  onNavClick,
  sending,
}: {
  msg: Msg;
  onNavClick: (nav: NavSuggestion) => void;
  sending: boolean;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-emerald-600/30 border border-emerald-500/30 rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap leading-snug">
          {msg.images && msg.images.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {msg.images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="attachment" className="max-h-40 rounded-lg border border-white/10" />
              ))}
            </div>
          )}
          {msg.text}
        </div>
      </div>
    );
  }
  const showSpinner = sending && !msg.text && msg.toolCalls.every((t) => t.status !== "running");
  const runningTool = msg.toolCalls.find((t) => t.status === "running");
  return (
    <div className="space-y-2">
      <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[90%] text-sm whitespace-pre-wrap leading-snug">
        {showSpinner && (
          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Thinking…
          </span>
        )}
        {runningTool && !msg.text && (
          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {humaniseTool(runningTool.name)}…
          </span>
        )}
        <Linkify text={cleanText(msg.text)} />
        {sending && msg.text && (
          <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse ml-0.5 align-baseline" />
        )}
      </div>

      {msg.toolCalls.filter((t) => t.status !== "running" && !t.navigation).length > 0 && (
        <div className="flex flex-wrap gap-1 ml-1">
          {msg.toolCalls
            .filter((t) => t.status !== "running" && !t.navigation)
            .map((t) => (
              <span
                key={t.id}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  t.status === "error"
                    ? "bg-rose-950/40 border-rose-800/50 text-rose-300"
                    : "bg-slate-800/40 border-white/10 text-slate-400"
                }`}
                title={t.preview}
              >
                {humaniseTool(t.name)}
              </span>
            ))}
        </div>
      )}

      {msg.navigations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 ml-1">
          {msg.navigations.map((nav, i) => (
            <button
              key={i}
              onClick={() => onNavClick(nav)}
              className="text-xs bg-gradient-to-br from-emerald-500/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-600/30 border border-emerald-500/30 hover:border-emerald-400/50 text-emerald-200 px-2.5 py-1 rounded-lg font-medium transition-all"
            >
              {nav.label} →
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function humaniseTool(name: string): string {
  return (
    {
      get_properties: "Reading properties",
      get_pipeline_deals: "Reading pipeline",
      refresh_notion_cache: "Refreshing Notion",
      navigate_to: "Suggesting page",
    }[name] || name
  );
}

function summariseResult(name: string, result: unknown): string {
  try {
    if (typeof result !== "object" || result === null) return JSON.stringify(result).slice(0, 80);
    const r = result as Record<string, unknown>;
    if (name === "get_properties") return `${r.count} properties`;
    if (name === "get_pipeline_deals") return `${r.shown}/${r.total_matching} deals`;
    if (name === "refresh_notion_cache") return "cache cleared";
    return JSON.stringify(r).slice(0, 80);
  } catch {
    return "";
  }
}

// Discriminated union for SSE event payloads — see server/lib/chat.js for the source-of-truth shapes.
type SseTextEvent = { type: "text"; data: { delta: string } };
type SseToolUseStartEvent = { type: "tool_use_start"; data: { id: string; name: string } };
type SseToolResultEvent = {
  type: "tool_result";
  data: {
    id: string;
    error?: string;
    result?: {
      navigation?: NavSuggestion;
      [k: string]: unknown;
    };
    name?: string;
  };
};
type SseErrorEvent = { type: "error"; data: { message: string } };
// Other events the server emits (usage, done, etc.) — payload shape varies, we don't read them at the call site.
type SseOtherEvent = { type: "usage" | "done" | "tool_use_end"; data: Record<string, unknown> };
export type SseEvent =
  | SseTextEvent
  | SseToolUseStartEvent
  | SseToolResultEvent
  | SseErrorEvent
  | SseOtherEvent;

async function consumeSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SseEvent) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = raw.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        onEvent({ type: event, data: parsed } as SseEvent);
      } catch {
        /* malformed chunk, skip */
      }
    }
  }
}
