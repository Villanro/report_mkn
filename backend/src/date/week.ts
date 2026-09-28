import type { OrdsRow } from "../types/ordsRow.js";

export interface DayInfo {
  bsc_fecha: string;
  tie_bsc_descripcion: string;
  /** Código de semana fiscal, ej. "26P09W4" (parte de tie_bsc_descripcion antes de " - "). */
  weekKey: string;
  /** Encabezado de día = descripcion sin los 2 primeros caracteres, según la spec. */
  label: string;
}

export function weekKeyOf(descripcion: string): string {
  return descripcion.split(" - ")[0] ?? descripcion;
}

export function dayLabelOf(descripcion: string): string {
  return descripcion.slice(2);
}

function toDayInfo(row: OrdsRow): DayInfo {
  return {
    bsc_fecha: row.bsc_fecha,
    tie_bsc_descripcion: row.tie_bsc_descripcion,
    weekKey: weekKeyOf(row.tie_bsc_descripcion),
    label: dayLabelOf(row.tie_bsc_descripcion),
  };
}

const MM_DD_YYYY = /(\d{2})\/(\d{2})\/(\d{4})/;

/**
 * Clave de orden cronológico real. `bsc_fecha` en ORDS NO es un ISO date: es una etiqueta
 * tipo "6.- Sat 09/26/2026" (verificado contra datos reales el 2026-09-28), que solo por
 * casualidad ordena bien DENTRO de una semana (prefijo 1..7) pero se mezclaría entre semanas
 * distintas si se ordena como string. `tie_bsc_descripcion` sí trae una fecha MM/DD/YYYY
 * fiable al final (ej. "26P09W4 - 09/26/2026"): se usa esa para ordenar.
 */
function sortKey(descripcion: string): string {
  const match = descripcion.match(MM_DD_YYYY);
  if (!match) return descripcion;
  const [, month, day, year] = match;
  return `${year}-${month}-${day}`;
}

/** Días únicos disponibles en `rows`, ordenados de más antiguo a más reciente. */
export function getAvailableDays(rows: OrdsRow[]): DayInfo[] {
  const byDate = new Map<string, DayInfo>();
  for (const row of rows) {
    if (!byDate.has(row.bsc_fecha)) byDate.set(row.bsc_fecha, toDayInfo(row));
  }
  return [...byDate.values()].sort((a, b) =>
    sortKey(a.tie_bsc_descripcion).localeCompare(sortKey(b.tie_bsc_descripcion)),
  );
}

/**
 * Resuelve los 7 días (domingo a sábado, ordenados de más antiguo a más reciente) de la
 * semana fiscal que contiene `dayParam` (una fecha `bsc_fecha` o una `tie_bsc_descripcion`).
 * Sin `dayParam`, usa la semana más reciente disponible en `rows`.
 */
export function resolveWeekDays(rows: OrdsRow[], dayParam?: string): DayInfo[] {
  const allDays = getAvailableDays(rows);
  if (allDays.length === 0) return [];

  let weekKey: string;
  if (dayParam) {
    const match = allDays.find((d) => d.bsc_fecha === dayParam || d.tie_bsc_descripcion === dayParam);
    weekKey = match ? match.weekKey : allDays[allDays.length - 1].weekKey;
  } else {
    weekKey = allDays[allDays.length - 1].weekKey;
  }

  return allDays.filter((d) => d.weekKey === weekKey);
}
