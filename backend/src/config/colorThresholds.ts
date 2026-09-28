/**
 * Umbrales de color (verde/amarillo/rojo) de la tabla "Reglas de color" de docs/spec-bsc.md.
 *
 * Los porcentajes se guardan como fracciones (2% -> 0.02), igual que los `pct` que devuelve kpis.ts.
 * Las métricas de SOS (segundos) se guardan en unidades crudas (no son porcentajes).
 *
 * Cada regla se evalúa en orden green -> yellow -> red (primer rango que matchee gana), lo que
 * permite expresar límites inclusive/exclusive exactos sin dejar huecos ni solapamientos.
 *
 * Nota de interpretación: la spec da límites textuales como "≤5%" / "6%-9%" / "≥10%" que dejan
 * huecos entre números redondos consecutivos (p.ej. 5%-6%). Para no dejar valores sin color se
 * ubica el límite común como frontera exacta entre dos rangos (ver OSAT_PCT, ZOD_PCT y
 * PROBLEM_RESOLUTION_PCT).
 */

export type Color = "green" | "yellow" | "red";

export interface RangeBound {
  min?: number;
  minInclusive?: boolean;
  max?: number;
  maxInclusive?: boolean;
}

export interface ColorRule {
  green: RangeBound;
  yellow: RangeBound;
  red: RangeBound;
}

function inRange(value: number, range: RangeBound): boolean {
  if (range.min !== undefined) {
    if (range.minInclusive ? value < range.min : value <= range.min) return false;
  }
  if (range.max !== undefined) {
    if (range.maxInclusive ? value > range.max : value >= range.max) return false;
  }
  return true;
}

export function evaluateColor(rule: ColorRule, value: number): Color {
  if (inRange(value, rule.green)) return "green";
  if (inRange(value, rule.yellow)) return "yellow";
  return "red";
}

export const COLOR_THRESHOLDS = {
  salesVsLastWeekPct: {
    green: { min: 0, minInclusive: false },
    yellow: { min: -0.03, minInclusive: true, max: 0, maxInclusive: true },
    red: { max: -0.03, maxInclusive: false },
  },
  salesVsLastYearPct: {
    green: { min: 0, minInclusive: false },
    yellow: { min: -0.03, minInclusive: true, max: 0, maxInclusive: true },
    red: { max: -0.03, maxInclusive: false },
  },
  transVsLastYearPct: {
    green: { min: 0, minInclusive: false },
    yellow: { min: -0.01, minInclusive: true, max: 0, maxInclusive: true },
    red: { max: -0.01, maxInclusive: false },
  },
  couponsPct: {
    green: { max: 0.02, maxInclusive: false },
    yellow: { min: 0.02, minInclusive: true, max: 0.03, maxInclusive: true },
    red: { min: 0.03, minInclusive: false },
  },
  discountsPct: {
    green: { max: 0.02, maxInclusive: false },
    yellow: { min: 0.02, minInclusive: true, max: 0.03, maxInclusive: true },
    red: { min: 0.03, minInclusive: false },
  },
  emplManagerMealsPct: {
    green: { max: 0.0052, maxInclusive: false },
    yellow: { min: 0.0052, minInclusive: true, max: 0.0075, maxInclusive: true },
    red: { min: 0.0075, minInclusive: false },
  },
  refundsPct: {
    green: { max: 0.0025, maxInclusive: false },
    yellow: { min: 0.0025, minInclusive: true, max: 0.005, maxInclusive: true },
    red: { min: 0.005, minInclusive: false },
  },
  managerVoidsPct: {
    green: { max: 0.005, maxInclusive: false },
    yellow: { min: 0.005, minInclusive: true, max: 0.01, maxInclusive: false },
    red: { min: 0.01, minInclusive: true },
  },
  cashPct: {
    green: { max: 0.0004, maxInclusive: false },
    yellow: { min: 0.0004, minInclusive: true, max: 0.0011, maxInclusive: true },
    red: { min: 0.0011, minInclusive: false },
  },
  avgLaborHrGuidePct: {
    green: { max: 0.03, maxInclusive: false },
    yellow: { min: 0.03, minInclusive: true, max: 0.06, maxInclusive: true },
    red: { min: 0.06, minInclusive: false },
  },
  laborPct: {
    green: { max: 0.24, maxInclusive: false },
    yellow: { min: 0.24, minInclusive: true, max: 0.28, maxInclusive: true },
    red: { min: 0.28, minInclusive: false },
  },
  osatPct: {
    green: { min: 0.8, minInclusive: false },
    yellow: { min: 0.65, minInclusive: true, max: 0.8, maxInclusive: false },
    red: { max: 0.65, maxInclusive: false },
  },
  zodPct: {
    green: { max: 0.05, maxInclusive: true },
    yellow: { min: 0.05, minInclusive: false, max: 0.1, maxInclusive: false },
    red: { min: 0.1, minInclusive: true },
  },
  problemResolutionPct: {
    green: { min: 0.4, minInclusive: true },
    yellow: { min: 0.2, minInclusive: false, max: 0.4, maxInclusive: false },
    red: { max: 0.2, maxInclusive: true },
  },
  sosDaySeconds: {
    green: { max: 200, maxInclusive: true },
    yellow: { min: 200, minInclusive: false, max: 220, maxInclusive: true },
    red: { min: 220, minInclusive: false },
  },
  sosDp1Dp2Seconds: {
    green: { max: 150, maxInclusive: true },
    yellow: { min: 150, minInclusive: false, max: 170, maxInclusive: true },
    red: { min: 170, minInclusive: false },
  },
  sosDp3Dp4Seconds: {
    green: { max: 170, maxInclusive: true },
    yellow: { min: 170, minInclusive: false, max: 190, maxInclusive: true },
    red: { min: 190, minInclusive: false },
  },
  sosDp5Seconds: {
    green: { max: 200, maxInclusive: true },
    yellow: { min: 200, minInclusive: false, max: 220, maxInclusive: true },
    red: { min: 220, minInclusive: false },
  },
  sosDp6Seconds: {
    green: { max: 250, maxInclusive: true },
    yellow: { min: 250, minInclusive: false, max: 270, maxInclusive: true },
    red: { min: 270, minInclusive: false },
  },
} as const satisfies Record<string, ColorRule>;

export type ColorThresholdKey = keyof typeof COLOR_THRESHOLDS;

export function getColor(metric: ColorThresholdKey, value: number): Color {
  return evaluateColor(COLOR_THRESHOLDS[metric], value);
}
