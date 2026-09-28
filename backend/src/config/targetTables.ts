/**
 * Tabla A (Labor % target) y Tabla B (SPMH target) de docs/spec-bsc.md, indexadas por
 * "Average Sales by Store $" (= Net Sales / uno). Guardadas como datos, no hardcodeadas
 * en las funciones de cálculo de kpis.ts.
 */

export interface TableCut {
  /** Límite superior (inclusive) de Avg Sales by Store para este corte; Infinity = "mayor". */
  maxInclusive: number;
  value: number;
}

/** Labor % target según Avg Sales by Store $. */
export const LABOR_PCT_TARGET_TABLE: readonly TableCut[] = [
  { maxInclusive: 4286, value: 0.255 },
  { maxInclusive: 5000, value: 0.245 },
  { maxInclusive: 5714, value: 0.235 },
  { maxInclusive: 6429, value: 0.225 },
  { maxInclusive: 7143, value: 0.215 },
  { maxInclusive: 7857, value: 0.205 },
  { maxInclusive: 8571, value: 0.195 },
  { maxInclusive: 9286, value: 0.185 },
  { maxInclusive: Infinity, value: 0.1775 },
];

/** SPMH $ target según Avg Sales by Store $. */
export const SPMH_TARGET_TABLE: readonly TableCut[] = [
  { maxInclusive: 3571, value: 38 },
  { maxInclusive: 4286, value: 46 },
  { maxInclusive: 5000, value: 48 },
  { maxInclusive: 5714, value: 55 },
  { maxInclusive: 6429, value: 59 },
  { maxInclusive: 7143, value: 63 },
  { maxInclusive: 7857, value: 65 },
  { maxInclusive: 8571, value: 68 },
  { maxInclusive: 9286, value: 70 },
  { maxInclusive: Infinity, value: 72 },
];

function lookup(table: readonly TableCut[], avgSalesByStore: number): number {
  const cut = table.find((c) => avgSalesByStore <= c.maxInclusive);
  return (cut ?? table[table.length - 1]).value;
}

export function getLaborPctTarget(avgSalesByStore: number): number {
  return lookup(LABOR_PCT_TARGET_TABLE, avgSalesByStore);
}

export function getSpmhTarget(avgSalesByStore: number): number {
  return lookup(SPMH_TARGET_TABLE, avgSalesByStore);
}
