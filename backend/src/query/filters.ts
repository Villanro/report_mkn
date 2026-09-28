import type { OrdsRow } from "../types/ordsRow.js";

/**
 * Filtros multi-select (tipo segmentación de Excel) del BSC principal.
 * OR entre valores de una misma categoría, AND entre categorías distintas.
 */
export interface BscFilters {
  company?: string[];
  division?: string[];
  area?: string[];
  district?: string[];
  store?: string[];
  building?: string[];
  region?: string[];
  careStatus?: string[];
}

export const FILTER_FIELD_MAP: Record<keyof BscFilters, keyof OrdsRow> = {
  company: "bsc_company",
  division: "division",
  area: "area",
  district: "district",
  store: "store",
  building: "building",
  region: "region",
  careStatus: "tie_care_status",
};

export const FILTER_KEYS = Object.keys(FILTER_FIELD_MAP) as (keyof BscFilters)[];

/** Acepta tanto `?division=A&division=B` (array) como `?division=A,B` (CSV) en req.query. */
function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const list = Array.isArray(value) ? value : [value];
  const values = list
    .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return values.length > 0 ? values : undefined;
}

export function parseFilters(query: Record<string, unknown>): BscFilters {
  const filters: BscFilters = {};
  for (const key of FILTER_KEYS) {
    const values = toStringArray(query[key]);
    if (values) filters[key] = values;
  }
  return filters;
}

/** Aplica todas las categorías de `filters`, salvo `exclude` (usado para cascada de /api/filters). */
export function applyFilters(rows: OrdsRow[], filters: BscFilters, exclude?: keyof BscFilters): OrdsRow[] {
  const activeKeys = FILTER_KEYS.filter((key) => key !== exclude && filters[key]);
  if (activeKeys.length === 0) return rows;

  return rows.filter((row) =>
    activeKeys.every((key) => {
      const values = filters[key];
      if (!values) return true;
      const field = FILTER_FIELD_MAP[key];
      return values.includes(String(row[field] ?? ""));
    }),
  );
}
