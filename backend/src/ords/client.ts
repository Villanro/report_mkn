import type { OrdsRow } from "../types/ordsRow.js";
import { OrdsUnavailableError } from "../errors.js";
import { generateMockRows } from "./mockData.js";

interface OrdsLink {
  rel: string;
  href: string;
}

interface OrdsResponse {
  items: Record<string, unknown>[];
  hasMore: boolean;
  limit: number;
  offset: number;
  links: OrdsLink[];
}

const PAGE_LIMIT = 500;

function getOrdsUrl(): string {
  const url = process.env.ORDS_URL;
  if (!url) {
    throw new OrdsUnavailableError("ORDS_URL no está configurado en el entorno (.env)");
  }
  return url;
}

/**
 * `ORDS_AUTH=basic` (junto a ORDS_USER/ORDS_PASSWORD): agrega el header
 * `Authorization: Basic <base64(user:password)>` a cada request a ORDS. Sin `ORDS_AUTH`,
 * o con cualquier otro valor, no se agrega ningún header (comportamiento actual sin cambios).
 */
export function getAuthHeaders(): Record<string, string> {
  if (process.env.ORDS_AUTH !== "basic") return {};

  const user = process.env.ORDS_USER;
  const password = process.env.ORDS_PASSWORD;
  if (!user || !password) {
    throw new OrdsUnavailableError(
      "ORDS_AUTH=basic requiere ORDS_USER y ORDS_PASSWORD configurados en el entorno (.env)",
    );
  }

  const token = Buffer.from(`${user}:${password}`, "utf-8").toString("base64");
  return { Authorization: `Basic ${token}` };
}

function normalizeRow(raw: Record<string, unknown>): OrdsRow {
  const row: Record<string, unknown> = { ...raw };
  for (const key of Object.keys(row)) {
    if (row[key] === null) {
      row[key] = 0;
    }
  }
  return row as unknown as OrdsRow;
}

async function fetchPage(url: string, headers: Record<string, string>): Promise<OrdsResponse> {
  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch (cause) {
    throw new OrdsUnavailableError(`No se pudo conectar a ORDS: ${url}`, { cause });
  }

  if (!response.ok) {
    throw new OrdsUnavailableError(`Error al consultar ORDS (${response.status}): ${url}`);
  }

  try {
    return (await response.json()) as OrdsResponse;
  } catch (cause) {
    throw new OrdsUnavailableError(`Respuesta de ORDS no es JSON válido: ${url}`, { cause });
  }
}

/**
 * `ORDS_MODE=mock` (solo desarrollo): evita ORDS_URL por completo y sirve un dataset
 * sintético generado en mockData.ts. El default (sin la env var, o cualquier otro valor)
 * sigue siendo el comportamiento real contra ORDS_URL.
 */
function isMockMode(): boolean {
  return process.env.ORDS_MODE === "mock";
}

export async function fetchAllRows(): Promise<OrdsRow[]> {
  if (isMockMode()) {
    return generateMockRows();
  }

  const baseUrl = getOrdsUrl();
  const headers = getAuthHeaders();
  const initialUrl = new URL(baseUrl);
  initialUrl.searchParams.set("limit", String(PAGE_LIMIT));

  const rows: OrdsRow[] = [];
  let nextUrl: string | undefined = initialUrl.toString();

  while (nextUrl) {
    const page: OrdsResponse = await fetchPage(nextUrl, headers);
    for (const item of page.items) {
      rows.push(normalizeRow(item));
    }

    if (page.hasMore) {
      const next = page.links?.find((link) => link.rel === "next");
      nextUrl = next?.href;
    } else {
      nextUrl = undefined;
    }
  }

  return rows;
}
