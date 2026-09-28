import { Router } from "express";
import { runChat, type ChatTurn } from "../chat/chatService.js";

export const chatRouter = Router();

function isValidHistory(value: unknown): value is ChatTurn[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (turn) =>
      turn &&
      typeof turn === "object" &&
      (turn.role === "user" || turn.role === "assistant") &&
      typeof turn.content === "string",
  );
}

/**
 * POST /api/chat
 * Body: { message: string, history?: { role: "user"|"assistant", content: string }[] }
 *
 * Preguntas que cruzan varios días/tiendas pueden tardar 1-2 minutos reales (varias rondas de
 * tool-calling con un modelo de razonamiento) — para no dejar al usuario mirando un spinner
 * ciego, la respuesta se transmite como NDJSON (una línea = un objeto JSON, streameado a medida
 * que ocurre, no bufferizado):
 *   {"type":"status","label":"..."}   — progreso legible mientras el modelo piensa/usa tools.
 *   {"type":"final","reply":"..."}    — última línea en el caso de éxito.
 *   {"type":"error","message":"..."}  — última línea si algo falla (nunca deja la conexión
 *                                       colgada: siempre se escribe una línea final o error).
 */
chatRouter.post("/chat", async (req, res) => {
  const { message, history } = req.body ?? {};

  if (typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message es requerido" });
    return;
  }
  if (history !== undefined && !isValidHistory(history)) {
    res.status(400).json({ error: "history inválido: debe ser [{ role: 'user'|'assistant', content: string }]" });
    return;
  }

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  try {
    const reply = await runChat(history ?? [], message, (event) => {
      res.write(`${JSON.stringify(event)}\n`);
    });
    res.write(`${JSON.stringify({ type: "final", reply })}\n`);
  } catch (err) {
    console.error("[chat]", err);
    res.write(`${JSON.stringify({ type: "error", message: "No se pudo obtener respuesta del asistente." })}\n`);
  } finally {
    res.end();
  }
});
