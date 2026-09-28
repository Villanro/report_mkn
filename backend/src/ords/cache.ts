import type { OrdsRow } from "../types/ordsRow.js";
import { fetchAllRows } from "./client.js";

let cachedRows: OrdsRow[] | undefined;
let cachedAt: number | undefined;
let inFlight: Promise<OrdsRow[]> | undefined;

function getTtlMs(): number {
  const minutes = Number(process.env.CACHE_TTL_MIN ?? "10");
  return (Number.isFinite(minutes) ? minutes : 10) * 60 * 1000;
}

function isExpired(): boolean {
  if (cachedAt === undefined) return true;
  return Date.now() - cachedAt > getTtlMs();
}

/** Devuelve las filas de ORDS, sirviendo desde caché mientras no haya expirado el TTL. */
export async function getRows(): Promise<OrdsRow[]> {
  if (cachedRows && !isExpired()) {
    return cachedRows;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = fetchAllRows()
    .then((rows) => {
      cachedRows = rows;
      cachedAt = Date.now();
      return rows;
    })
    .finally(() => {
      inFlight = undefined;
    });

  return inFlight;
}

/** Invalida la caché para forzar un refresco en la próxima lectura (usado por POST /api/refresh). */
export function invalidateCache(): void {
  cachedRows = undefined;
  cachedAt = undefined;
}
