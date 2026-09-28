/**
 * Cliente HTTP hacia la API de Kimi (Moonshot), compatible con el formato de Chat Completions
 * de OpenAI (incluye `tools`/tool-calling y streaming SSE). Endpoint y modelo confirmados a mano
 * contra la API real con la KIMI_API_KEY del proyecto (2026-09-28):
 *   - Base URL: https://api.moonshot.ai/v1 (la cuenta vive en la plataforma internacional
 *     ".ai" — la variante ".cn" devuelve 401 Invalid Authentication con esta misma key).
 *   - Modelo: "kimi-k2.6" (de /v1/models; soporta tool-calling, verificado con una llamada real
 *     que devolvió un tool_call correcto). Otros modelos listados en la cuenta (kimi-k3,
 *     kimi-k2.7-code, kimi-k2.7-code-highspeed) no se probaron por no ser necesarios aquí.
 *
 * `thinking: { type: "disabled" }` — probado a mano contra la API real (2026-09-28): con la
 * config por defecto (thinking activado) una pregunta trivial gastaba ~99 "reasoning_tokens";
 * con thinking deshabilitado, ~1 (esencialmente apagado), y una llamada con tool-calling que
 * antes tardaba varios segundos bajó a ~1.2s, sin degradar qué tool elige ni sus argumentos (se
 * probó explícitamente antes de dejarlo fijo). Ahora que rank_stores/get_trend/find_alerts hacen
 * el análisis pesado en código determinístico, el modelo solo necesita elegir la tool correcta y
 * redactar — no necesita razonar en el sentido de "pensar antes de responder". Si en el futuro se
 * agregan preguntas que requieran razonamiento multi-paso genuino (no solo elegir/encadenar
 * tools), reevaluar volviendo a `reasoning_effort: "low"` o quitando este flag.
 */

const KIMI_BASE_URL = "https://api.moonshot.ai/v1";
const KIMI_MODEL = "kimi-k2.6";

/**
 * Preguntas que cruzan varios días/tiendas pueden tardar legítimamente bastante por ronda
 * (payload grande de tools) — medido en pruebas reales. Con streaming, este timeout protege
 * contra una conexión realmente colgada (sin ningún byte nuevo) en vez del request completo, ver
 * `withIdleTimeout` más abajo.
 */
const KIMI_TIMEOUT_MS = 90_000;

export interface KimiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface KimiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: KimiToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface KimiToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface KimiStreamDelta {
  role?: string;
  content?: string;
  tool_calls?: {
    index: number;
    id?: string;
    type?: "function";
    function?: { name?: string; arguments?: string };
  }[];
}

interface KimiStreamChunk {
  choices: { delta: KimiStreamDelta; finish_reason: string | null }[];
}

/**
 * Reconstruye tool_calls a partir de deltas incrementales (cada chunk trae un pedacito del
 * `arguments` de un tool_call identificado por `index`, igual que el streaming de OpenAI).
 */
function mergeToolCallDelta(
  accumulated: Map<number, { id: string; name: string; arguments: string }>,
  deltas: KimiStreamDelta["tool_calls"],
): void {
  if (!deltas) return;
  for (const delta of deltas) {
    const existing = accumulated.get(delta.index) ?? { id: "", name: "", arguments: "" };
    if (delta.id) existing.id = delta.id;
    if (delta.function?.name) existing.name += delta.function.name;
    if (delta.function?.arguments) existing.arguments += delta.function.arguments;
    accumulated.set(delta.index, existing);
  }
}

/**
 * Llama a Kimi con streaming SSE. Si el modelo devuelve texto (sin tool_calls), cada pedazo de
 * texto se reenvía en vivo vía `onToken` a medida que llega — en la práctica esto solo pasa en la
 * ronda final de síntesis, porque cuando el modelo pide tools no emite `content` (confirmado
 * contra la API real). Devuelve el mensaje completo reconstruido, con la misma forma que antes
 * (compatible con el resto del loop de tool-calling en chatService.ts).
 */
export async function callKimi(
  messages: KimiMessage[],
  tools: KimiToolDef[],
  onToken?: (text: string) => void,
): Promise<KimiMessage> {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    throw new Error("KIMI_API_KEY no está configurado en el entorno (.env)");
  }

  const controller = new AbortController();
  let idleTimeout: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), KIMI_TIMEOUT_MS);
  const resetIdleTimeout = () => {
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => controller.abort(), KIMI_TIMEOUT_MS);
  };

  let res: Response;
  try {
    res = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages,
        tools,
        thinking: { type: "disabled" },
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch (cause) {
    clearTimeout(idleTimeout);
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new Error(`Kimi API: sin respuesta tras ${KIMI_TIMEOUT_MS / 1000}s (timeout)`);
    }
    throw cause;
  }

  if (!res.ok) {
    clearTimeout(idleTimeout);
    const body = await res.text();
    throw new Error(`Kimi API error ${res.status}: ${body}`);
  }
  if (!res.body) {
    clearTimeout(idleTimeout);
    throw new Error("Kimi API: respuesta sin cuerpo (stream)");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();

  try {
    while (true) {
      let chunk: Awaited<ReturnType<typeof reader.read>>;
      try {
        chunk = await reader.read();
      } catch (cause) {
        if (cause instanceof Error && cause.name === "AbortError") {
          throw new Error(`Kimi API: sin datos nuevos tras ${KIMI_TIMEOUT_MS / 1000}s (timeout)`);
        }
        throw cause;
      }
      if (chunk.done) break;
      resetIdleTimeout();

      buffer += decoder.decode(chunk.value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;

        const parsed = JSON.parse(data) as KimiStreamChunk;
        const delta = parsed.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          content += delta.content;
          onToken?.(delta.content);
        }
        mergeToolCallDelta(toolCalls, delta.tool_calls);
      }
    }
  } finally {
    clearTimeout(idleTimeout);
  }

  const sortedToolCalls = [...toolCalls.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, call]) => ({
      id: call.id,
      type: "function" as const,
      function: { name: call.name, arguments: call.arguments },
    }));

  return {
    role: "assistant",
    content: content || null,
    tool_calls: sortedToolCalls.length > 0 ? sortedToolCalls : undefined,
  };
}
