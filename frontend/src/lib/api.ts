import type {
  AuthUser,
  BscResponse,
  DayInfo,
  FilterOptions,
  FilterSelection,
  HierarchyGroup,
  HierarchySectionKey,
} from "@/types";

/** El backend exige cookie httpOnly (JWT) en todos los endpoints salvo /api/login; el
 * navegador la adjunta automáticamente en same-origin (el proxy de Vite hace /api ->
 * localhost:3001 same-origin), así que no hace falta `credentials: "include"` en dev. */

function buildQuery(selection: Partial<FilterSelection>, extra?: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  Object.entries(selection).forEach(([key, values]) => {
    (values ?? []).forEach((v) => params.append(key, v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json();
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function fetchDays(): Promise<DayInfo[]> {
  return json(await fetch("/api/days"));
}

export async function fetchFilters(
  selection: Partial<FilterSelection> = {}
): Promise<FilterOptions> {
  return json(await fetch(`/api/filters${buildQuery(selection)}`));
}

export async function fetchBsc(
  selection: Partial<FilterSelection> = {},
  day?: string
): Promise<BscResponse> {
  const qs = buildQuery(selection, day ? { day } : undefined);
  return json(await fetch(`/api/bsc${qs}`));
}

export async function fetchHierarchy(
  day: string,
  level: "area" | "district" | "store",
  section: HierarchySectionKey,
  selection: Partial<FilterSelection> = {}
): Promise<HierarchyGroup[]> {
  const qs = buildQuery(selection, { day, level, section });
  return json(await fetch(`/api/hierarchy${qs}`));
}

export async function postRefresh(): Promise<void> {
  await fetch("/api/refresh", { method: "POST" });
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return json(res);
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", { method: "POST" });
}

export async function fetchMe(): Promise<AuthUser> {
  return json(await fetch("/api/me"));
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSource {
  tool: string;
  args: Record<string, unknown>;
}

export interface ChatResult {
  reply: string;
  sources: ChatSource[];
}

/** Líneas NDJSON que puede emitir POST /api/chat mientras el modelo razona/usa tools (ver
 * backend/src/routes/chat.ts) — preguntas que cruzan varios días/tiendas pueden tardar 1-2
 * minutos reales, así que el backend transmite progreso en vez de un único JSON al final. */
type ChatStreamEvent =
  | { type: "status"; label: string }
  | { type: "token"; text: string }
  | { type: "sources"; items: ChatSource[] }
  | { type: "final"; reply: string }
  | { type: "error"; message: string };

/** Envía un mensaje al asistente y transmite el progreso vía `onStatus` y el texto de la
 * respuesta final palabra por palabra vía `onToken` a medida que llega (ver ronda de streaming
 * real en backend/src/chat/kimiClient.ts). Devuelve la respuesta final completa junto con las
 * tools usadas para construirla (o lanza ApiError si el servidor devolvió un error). */
export async function postChat(
  message: string,
  history: ChatTurn[],
  onStatus?: (label: string) => void,
  onToken?: (text: string) => void
): Promise<ChatResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  if (!res.body) {
    throw new ApiError(res.status, "Respuesta sin cuerpo");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sources: ChatSource[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.trim()) continue;

      const event = JSON.parse(line) as ChatStreamEvent;
      if (event.type === "status") onStatus?.(event.label);
      else if (event.type === "token") onToken?.(event.text);
      else if (event.type === "sources") sources = event.items;
      else if (event.type === "final") return { reply: event.reply, sources };
      else if (event.type === "error") throw new ApiError(500, event.message);
    }
  }

  throw new ApiError(500, "El asistente no devolvió una respuesta.");
}
