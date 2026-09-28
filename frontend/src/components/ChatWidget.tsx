import { useEffect, useRef, useState } from "react";
import { ApiError, postChat, type ChatSource, type ChatTurn } from "@/lib/api";

interface DisplayMessage extends ChatTurn {
  sources?: ChatSource[];
}

/** Nombre corto y legible para citar una tool en la sección "fuente:" (ej. "get_hierarchy(day:
 * 7.- Sun 09/27/2026, level: store, section: sos)"). */
function formatSource(source: ChatSource): string {
  const args = Object.entries(source.args)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : JSON.stringify(value)}`)
    .join(", ");
  return args ? `${source.tool}(${args})` : source.tool;
}

function SourcesDisclosure({ sources }: { sources: ChatSource[] }) {
  const [open, setOpen] = useState(false);
  if (sources.length === 0) return null;

  return (
    <div className="mt-1 text-xs text-gray-500">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 hover:text-gray-700"
        aria-label={open ? "Ocultar fuente" : "Ver fuente"}
      >
        <span className="w-3 shrink-0 text-gray-400">{open ? "▾" : "▸"}</span>
        fuente ({sources.length})
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 pl-4">
          {sources.map((source, i) => (
            <li key={i} className="break-all font-mono text-[11px] text-gray-500">
              {formatSource(source)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Burbuja flotante de chat, disponible en las 8 pantallas (montada en Layout.tsx). Llama
 * siempre a POST /api/chat en el propio backend — nunca a Kimi directo desde el navegador,
 * la API key del modelo no debe llegar al cliente.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string>("Pensando…");
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, status, streamingText]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const history = messages;
    setMessages([...history, { role: "user", content: text }]);
    setInput("");
    setError(null);
    setStatus("Pensando…");
    setStreamingText("");
    setSending(true);
    try {
      const { reply, sources } = await postChat(
        text,
        history,
        setStatus,
        (chunk) => setStreamingText((prev) => prev + chunk)
      );
      setMessages((prev) => [...prev, { role: "assistant", content: reply, sources }]);
      setStreamingText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo contactar al asistente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {open && (
        <div className="mb-2 flex h-[28rem] w-80 flex-col rounded-lg border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between rounded-t-lg bg-gray-800 px-3 py-2">
            <span className="text-sm font-semibold text-white">Asistente BSC</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white"
              aria-label="Cerrar chat"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400">
                Preguntame algo sobre el reporte, por ejemplo: "¿qué tienda tuvo el peor Service Time esta
                semana?"
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[85%]"}>
                <div
                  className={`whitespace-pre-wrap rounded-lg px-2.5 py-1.5 text-sm ${
                    msg.role === "user" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "assistant" && msg.sources && <SourcesDisclosure sources={msg.sources} />}
              </div>
            ))}
            {sending && streamingText && (
              <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-gray-100 px-2.5 py-1.5 text-sm text-gray-800">
                {streamingText}
              </div>
            )}
            {sending && !streamingText && (
              <div className="max-w-[85%] rounded-lg bg-gray-100 px-2.5 py-1.5 text-sm text-gray-400">
                {status}
              </div>
            )}
          </div>

          {error && <p className="px-3 pb-1 text-xs text-red-600">{error}</p>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex gap-2 border-t border-gray-200 p-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribí tu pregunta…"
              disabled={sending}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:outline-none disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={sending || input.trim().length === 0}
              className="rounded bg-gray-800 px-3 py-1 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-xl text-white shadow-lg hover:bg-gray-700"
        aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
