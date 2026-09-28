import { callKimi, type KimiMessage } from "./kimiClient.js";
import { TOOL_DEFS, runTool } from "./tools.js";
import { SYSTEM_PROMPT } from "./systemPrompt.js";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Una fuente citada: qué tool se usó y con qué argumentos clave (no el resultado completo) —
 * para que el frontend pueda mostrar de dónde salió cada número de la respuesta final. */
export interface ChatSource {
  tool: string;
  args: Record<string, unknown>;
}

/** Evento de progreso emitido durante el loop de tool-calling, para que el frontend muestre algo
 * más útil que un spinner genérico mientras Kimi razona (preguntas que cruzan varios
 * días/tiendas pueden tardar 1-2 minutos reales, medido: ~7-30s por ronda de Kimi), y para citar
 * las fuentes de la respuesta final. */
export type ChatProgressEvent =
  | { type: "status"; label: string }
  | { type: "token"; text: string }
  | { type: "sources"; items: ChatSource[] };
export type ChatProgressHandler = (event: ChatProgressEvent) => void;

const MAX_SOURCES = 40;

const MAX_TOOL_ROUNDS = 10;

/**
 * Presupuesto total (independiente del timeout por llamada de kimiClient.ts) para que una
 * pregunta no encadene rondas lentas indefinidamente sin dar ninguna respuesta al usuario.
 */
const TOTAL_BUDGET_MS = 240_000;

const TOOL_LABELS: Record<string, string> = {
  list_days: "días disponibles",
  list_kpis: "catálogo de KPIs",
  list_filter_options: "tiendas/distritos",
  get_bsc: "KPIs del BSC",
  get_hierarchy: "desglose por tienda/distrito",
};

function buildStatusLabel(toolNames: string[]): string {
  const counts = new Map<string, number>();
  for (const name of toolNames) counts.set(name, (counts.get(name) ?? 0) + 1);
  const parts = [...counts.entries()].map(([name, count]) => {
    const label = TOOL_LABELS[name] ?? name;
    return count > 1 ? `${label} (${count})` : label;
  });
  return `Consultando ${parts.join(", ")}…`;
}

/** Ejecuta el loop de tool-calling con Kimi hasta obtener una respuesta final en texto. */
export async function runChat(
  history: ChatTurn[],
  userMessage: string,
  onProgress?: ChatProgressHandler,
): Promise<string> {
  const messages: KimiMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((turn) => ({ role: turn.role, content: turn.content }) as KimiMessage),
    { role: "user", content: userMessage },
  ];

  const startedAt = Date.now();
  const sources: ChatSource[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    if (Date.now() - startedAt > TOTAL_BUDGET_MS) break;

    onProgress?.({ type: "status", label: round === 0 ? "Pensando…" : "Analizando los datos…" });
    const t0 = Date.now();
    const message = await callKimi(messages, TOOL_DEFS, (text) => {
      onProgress?.({ type: "token", text });
    });
    const toolNames = message.tool_calls?.map((c) => c.function.name) ?? [];
    console.log(`[chat] round ${round}: kimi ${Date.now() - t0}ms, tools=[${toolNames.join(",")}]`);
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      onProgress?.({ type: "sources", items: sources });
      return message.content ?? "";
    }

    onProgress?.({ type: "status", label: buildStatusLabel(toolNames) });

    // Las tools son envoltorios locales sobre datos ya cacheados (getRows()/aggregateRows()), así
    // que ejecutarlas en paralelo es seguro (no hay estado mutable compartido entre ellas) —
    // aunque en la práctica cada una tarda 1-3ms, medido, el cuello de botella real es Kimi.
    const parsedArgs = message.tool_calls.map((call) =>
      call.function.arguments ? JSON.parse(call.function.arguments) : {},
    );
    const results = await Promise.all(
      message.tool_calls.map(async (call, i) => {
        try {
          return await runTool(call.function.name, parsedArgs[i]);
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      }),
    );

    message.tool_calls.forEach((call, i) => {
      if (sources.length < MAX_SOURCES) sources.push({ tool: call.function.name, args: parsedArgs[i] });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(results[i]),
      });
    });
  }

  onProgress?.({ type: "sources", items: sources });
  return "No pude completar la respuesta (demasiadas consultas de datos encadenadas). Intenta reformular la pregunta de forma más específica.";
}
