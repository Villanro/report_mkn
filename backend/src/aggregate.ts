import type { OrdsRow } from "./types/ordsRow.js";

/**
 * Campos que se agregan con PROMEDIO en vez de SUMA al combinar varias filas
 * (tiendas) del mismo día, según docs/spec-bsc.md.
 */
export const AVERAGE_FIELDS = [
  "syr_service_time",
  "syr_sos_dp1",
  "syr_sos_dp2",
  "syr_sos_dp3",
  "syr_sos_dp4",
  "syr_sos_dp5",
  "syr_sos_dp6",
  "hr_labor_dp1",
  "hr_labor_dp2",
  "hr_labor_dp3",
  "hr_labor_dp4",
  "hr_labor_dp5",
  "hr_labor_dp6",
  "hr_guide_dp1",
  "hr_guide_dp2",
  "hr_guide_dp3",
  "hr_guide_dp4",
  "hr_guide_dp5",
  "hr_guide_dp6",
  "syr_upsize_pct",
] as const;

const AVERAGE_FIELD_SET = new Set<string>(AVERAGE_FIELDS);

/**
 * Fila resultado de agregar N `OrdsRow` de un mismo día. Todas las columnas numéricas
 * de la vista quedan disponibles con el mismo nombre (SUMA por defecto, PROMEDIO para
 * los campos en `AVERAGE_FIELDS`). Para cada campo de `AVERAGE_FIELDS` se expone además
 * `<campo>_sum` con la suma cruda (necesaria, por ejemplo, para "Breakfast Labor $", que
 * usa SUM(hr_labor_dp1) en vez del promedio).
 */
export interface AggregatedRow {
  [field: string]: number;
}

export function aggregateRows(rows: OrdsRow[]): AggregatedRow {
  const result: AggregatedRow = {};
  if (rows.length === 0) return result;

  const numericFields = new Set<string>();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "number") numericFields.add(key);
    }
  }

  for (const field of numericFields) {
    let sum = 0;
    for (const row of rows) {
      const value = row[field];
      sum += typeof value === "number" ? value : 0;
    }

    if (AVERAGE_FIELD_SET.has(field)) {
      result[field] = sum / rows.length;
      result[`${field}_sum`] = sum;
    } else {
      result[field] = sum;
    }
  }

  return result;
}
