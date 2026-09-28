import type { AggregatedRow } from "./aggregate.js";
import { type Color, type ColorThresholdKey, getColor } from "./config/colorThresholds.js";
import { getLaborPctTarget, getSpmhTarget } from "./config/targetTables.js";

/**
 * Diccionario de KPIs de docs/spec-bsc.md, ya agregados por día (una `AggregatedRow`
 * producida por `aggregateRows`, o directamente una `OrdsRow` de una sola tienda).
 *
 * Divisor 0 -> `undefined` ("vacío"), salvo que la spec indique explícitamente 0.
 * Los % se devuelven como fracción (0.245 = 24.5%), igual que `colorThresholds.ts` espera.
 */

export type NumericRow = AggregatedRow;

export interface KpiResult {
  value: number | undefined;
  pct?: number | undefined;
  color?: Color;
}

type DpNumber = 1 | 2 | 3 | 4 | 5 | 6;

function num(row: NumericRow, field: string): number {
  const value = row[field];
  return typeof value === "number" ? value : 0;
}

/** `undefined` ("vacío") cuando el divisor es 0, replicando la regla general de la spec. */
function safeDiv(numerator: number, denominator: number): number | undefined {
  return denominator === 0 ? undefined : numerator / denominator;
}

function withColor(value: number | undefined, metric: ColorThresholdKey): Color | undefined {
  return value === undefined ? undefined : getColor(metric, value);
}

/* ------------------------------------------------------------------------ */
/* OPERATIONS SCORECARD                                                      */
/* ------------------------------------------------------------------------ */

export function grossSales(row: NumericRow): KpiResult {
  return { value: num(row, "syr_gross_sales") };
}

export function netSales(row: NumericRow): KpiResult {
  return { value: num(row, "infs_vta_actual") };
}

/** Sales DP1..DP6, con % sobre Net Sales. */
export function dpSales(row: NumericRow, dp: DpNumber): KpiResult {
  const value = num(row, `syr_sal_dp${dp}`);
  const ns = num(row, "infs_vta_actual");
  return { value, pct: safeDiv(value, ns) };
}

export function puwSales(row: NumericRow): KpiResult {
  const value = num(row, "syr_sal_puw");
  return { value, pct: safeDiv(value, num(row, "infs_vta_actual")) };
}

export function deliverySales(row: NumericRow): KpiResult {
  const value = num(row, "syr_delivery");
  return { value, pct: safeDiv(value, num(row, "infs_vta_actual")) };
}

/** Upsize %: no tiene "valor", el % ya es el promedio agregado del campo. */
export function upsizePct(row: NumericRow): KpiResult {
  return { value: undefined, pct: num(row, "syr_upsize_pct") };
}

export function kioskTotalSales(row: NumericRow): KpiResult {
  const value = num(row, "kiosk_in_sales") + num(row, "kiosk_out_sales");
  return { value, pct: safeDiv(value, num(row, "kiosk_sales_ref")) };
}

export function kioskSales(row: NumericRow): KpiResult {
  const value = num(row, "kiosk_in_sales");
  return { value, pct: safeDiv(value, num(row, "kiosk_sales_ref")) };
}

export function toGoSales(row: NumericRow): KpiResult {
  const value = num(row, "syr_sal_llevar");
  return { value, pct: safeDiv(value, num(row, "infs_vta_actual")) };
}

export function mobileTotalSales(row: NumericRow): KpiResult {
  const value = num(row, "mobile_in_sales") + num(row, "mobile_out_sales") + num(row, "mobile_puw_sales");
  return { value, pct: safeDiv(value, num(row, "mobile_sales_ref")) };
}

export function mobileInSales(row: NumericRow): KpiResult {
  const value = num(row, "mobile_in_sales");
  return { value, pct: safeDiv(value, num(row, "mobile_sales_ref")) };
}

export function mobileToGoSales(row: NumericRow): KpiResult {
  const value = num(row, "mobile_out_sales");
  return { value, pct: safeDiv(value, num(row, "mobile_sales_ref")) };
}

export function mobilePuwSales(row: NumericRow): KpiResult {
  const value = num(row, "mobile_puw_sales");
  return { value, pct: safeDiv(value, num(row, "mobile_sales_ref")) };
}

export function handheldSales(row: NumericRow): KpiResult {
  const value = num(row, "syr_handheld_sales");
  return { value, pct: safeDiv(value, num(row, "syr_handheld_sales_ref")) };
}

export function avgSalesByStore(row: NumericRow): KpiResult {
  return { value: safeDiv(num(row, "infs_vta_actual"), num(row, "uno")) };
}

export function salesVsLastWeek(row: NumericRow): KpiResult {
  const ns = num(row, "infs_vta_actual");
  const lw = num(row, "syr_net_sales_lw");
  const value = ns - lw;
  const pct = safeDiv(value, lw);
  return { value, pct, color: withColor(pct, "salesVsLastWeekPct") };
}

export function salesVsLastYear(row: NumericRow): KpiResult {
  const cmp = num(row, "syr_net_sales_cmp_ly");
  const ly = num(row, "syr_net_sales_ly");
  const value = cmp - ly;
  const pct = safeDiv(value, ly);
  return { value, pct, color: withColor(pct, "salesVsLastYearPct") };
}

export function salesVs2YearAgo(row: NumericRow): KpiResult {
  const cmp = num(row, "syr_net_sales_cmp_ly2");
  const ly2 = num(row, "syr_net_sales_ly2");
  const value = cmp - ly2;
  return { value, pct: safeDiv(value, ly2) };
}

export function salesWTD(row: NumericRow): KpiResult {
  return { value: num(row, "syr4_gross_sales") };
}

export function salesWTDLastYear(row: NumericRow): KpiResult {
  const ly = num(row, "syr4_gross_sal_ly");
  const cmp = num(row, "syr4_gross_sales_cmp");
  const ratio = safeDiv(cmp, ly);
  return { value: ly, pct: ratio === undefined ? undefined : ratio - 1 };
}

export function salesPTD(row: NumericRow): KpiResult {
  return { value: num(row, "syr3_gross_sales") };
}

export function salesPTDLastYear(row: NumericRow): KpiResult {
  const ly = num(row, "syr3_gross_sal_ly");
  const cmp = num(row, "syr3_gross_sales_cmp");
  const ratio = safeDiv(cmp, ly);
  return { value: ly, pct: ratio === undefined ? undefined : ratio - 1 };
}

export function salesYTD(row: NumericRow): KpiResult {
  return { value: num(row, "syr5_gross_sales") };
}

export function salesYTDLastYear(row: NumericRow): KpiResult {
  const ly = num(row, "syr5_gross_sal_ly");
  const current = num(row, "syr5_gross_sales");
  const ratio = safeDiv(current, ly);
  return { value: ly, pct: ratio === undefined ? undefined : ratio - 1 };
}

export function coupons(row: NumericRow): KpiResult {
  const value = num(row, "syr_coupons");
  const pct = safeDiv(value, num(row, "infs_vta_actual"));
  return { value, pct, color: withColor(pct, "couponsPct") };
}

export function discounts(row: NumericRow): KpiResult {
  const value = num(row, "syr_discounts");
  const pct = safeDiv(value, num(row, "infs_vta_actual"));
  return { value, pct, color: withColor(pct, "discountsPct") };
}

export function employeeMeals(row: NumericRow): KpiResult {
  const value = num(row, "syr_empl_meal");
  const pct = safeDiv(value, num(row, "infs_vta_actual"));
  return { value, pct, color: withColor(pct, "emplManagerMealsPct") };
}

export function managerMeals(row: NumericRow): KpiResult {
  const value = num(row, "syr_mngr_meal");
  const pct = safeDiv(value, num(row, "infs_vta_actual"));
  return { value, pct, color: withColor(pct, "emplManagerMealsPct") };
}

export function transactions(row: NumericRow): KpiResult {
  return { value: num(row, "syr_trans") };
}

export function avgTransByStore(row: NumericRow): KpiResult {
  return { value: safeDiv(num(row, "syr_trans"), num(row, "uno")) };
}

export function transVsLastYear(row: NumericRow): KpiResult {
  const cmp = num(row, "syr_trans_cmp_ly");
  const ly = num(row, "syr_trans_ly");
  const value = cmp - ly;
  const pct = safeDiv(value, ly);
  return { value, pct, color: withColor(pct, "transVsLastYearPct") };
}

export function kioskTransactions(row: NumericRow): KpiResult {
  const value = num(row, "kiosk_in_trans") + num(row, "kiosk_out_trans");
  return { value, pct: safeDiv(value, num(row, "kiosk_trans_ref")) };
}

export function kioskInTrans(row: NumericRow): KpiResult {
  const value = num(row, "kiosk_in_trans");
  return { value, pct: safeDiv(value, num(row, "kiosk_trans_ref")) };
}

export function kioskToGoTrans(row: NumericRow): KpiResult {
  const value = num(row, "kiosk_out_trans");
  return { value, pct: safeDiv(value, num(row, "kiosk_trans_ref")) };
}

export function mobileTransactions(row: NumericRow): KpiResult {
  const value = num(row, "mobile_in_trans") + num(row, "mobile_out_trans") + num(row, "mobile_puw_trans");
  return { value, pct: safeDiv(value, num(row, "mobile_trans_ref")) };
}

export function mobileInTrans(row: NumericRow): KpiResult {
  const value = num(row, "mobile_in_trans");
  return { value, pct: safeDiv(value, num(row, "mobile_trans_ref")) };
}

export function mobileToGoTrans(row: NumericRow): KpiResult {
  const value = num(row, "mobile_out_trans");
  return { value, pct: safeDiv(value, num(row, "mobile_trans_ref")) };
}

export function mobilePuwTrans(row: NumericRow): KpiResult {
  const value = num(row, "mobile_puw_trans");
  return { value, pct: safeDiv(value, num(row, "mobile_trans_ref")) };
}

export function handheldTransactions(row: NumericRow): KpiResult {
  const value = num(row, "syr_handheld_trans");
  return { value, pct: safeDiv(value, num(row, "syr_handheld_trans_ref")) };
}

export function ticketAverage(row: NumericRow): KpiResult {
  return { value: safeDiv(num(row, "infs_vta_actual"), num(row, "syr_trans")) };
}

export function ticketAverageLastYear(row: NumericRow): KpiResult {
  return { value: safeDiv(num(row, "syr_net_sales_ly"), num(row, "syr_trans_ly")) };
}

export function laborHrGuide(row: NumericRow): KpiResult {
  const value = num(row, "syr_crew_hr") + num(row, "syr_mngr_hr") - num(row, "syr_guid_hr");
  const pct = safeDiv(value, num(row, "syr_guid_hr"));
  return { value, pct, color: withColor(pct, "avgLaborHrGuidePct") };
}

/** DP1..DP6 labor +/- guide: hr_labor_dpN - hr_guide_dpN (ambos promedio), % / hr_guide_dpN. */
export function dpLaborVsGuide(row: NumericRow, dp: DpNumber): KpiResult {
  const labor = num(row, `hr_labor_dp${dp}`);
  const guide = num(row, `hr_guide_dp${dp}`);
  const value = labor - guide;
  return { value, pct: safeDiv(value, guide) };
}

export function avgLaborHrGuide(row: NumericRow): KpiResult {
  const laborHr = laborHrGuide(row).value ?? 0;
  return { value: safeDiv(laborHr, num(row, "uno")) };
}

export function laborPctTargetVsActual(row: NumericRow): KpiResult {
  const target = getLaborPctTarget(avgSalesByStore(row).value ?? 0);
  const actual = safeDiv(num(row, "syr_labor"), num(row, "infs_vta_actual"));
  return { value: target, pct: actual, color: withColor(actual, "laborPct") };
}

export function laborCrewPct(row: NumericRow): KpiResult {
  const pct = safeDiv(num(row, "syr_crew_labor"), num(row, "syr_labor_sales_ref"));
  return { value: undefined, pct };
}

export function laborSsvPct(row: NumericRow): KpiResult {
  const pct = safeDiv(num(row, "syr_ssv_labor"), num(row, "syr_labor_sales_ref"));
  return { value: undefined, pct };
}

export function laborManagerPct(row: NumericRow): KpiResult {
  const pct = safeDiv(num(row, "syr_mngr_labor"), num(row, "syr_labor_sales_ref"));
  return { value: undefined, pct };
}

export function wtdOvertimeHrPct(row: NumericRow): KpiResult {
  const pct = safeDiv(num(row, "syr4_ovt_hr"), num(row, "syr4_hr"));
  return { value: undefined, pct };
}

export function serviceTime(row: NumericRow): KpiResult {
  const value = num(row, "syr_service_time");
  return { value, color: getColor("sosDaySeconds", value) };
}

const SOS_METRIC_BY_DP: Record<DpNumber, ColorThresholdKey> = {
  1: "sosDp1Dp2Seconds",
  2: "sosDp1Dp2Seconds",
  3: "sosDp3Dp4Seconds",
  4: "sosDp3Dp4Seconds",
  5: "sosDp5Seconds",
  6: "sosDp6Seconds",
};

/** DP1..DP6 SOS (promedio). Anomalía 1 corregida: DP2 usa syr_sos_dp2, no syr_sos_dp1. */
export function dpServiceTime(row: NumericRow, dp: DpNumber): KpiResult {
  const value = num(row, `syr_sos_dp${dp}`);
  return { value, color: getColor(SOS_METRIC_BY_DP[dp], value) };
}

export function carCount(row: NumericRow): KpiResult {
  const value = ([1, 2, 3, 4, 5, 6] as DpNumber[]).reduce(
    (sum, dp) => sum + num(row, `car_count_dp${dp}`),
    0,
  );
  return { value };
}

/**
 * DP1..DP6 Car Count %. Anomalía 2 corregida: se calcula directo como
 * car_count_dpN / Car Count (antes, en el Excel, "DP2 Car Count %" apuntaba
 * indirectamente al % del bloque general en vez de dividir directo).
 * Anomalía 1 corregida: DP2 usa car_count_dp2, no car_count_dp1.
 */
export function dpCarCount(row: NumericRow, dp: DpNumber): KpiResult {
  const value = num(row, `car_count_dp${dp}`);
  const pct = safeDiv(value, carCount(row).value ?? 0);
  return { value, pct };
}

export function spmhTargetVsActual(row: NumericRow): KpiResult {
  const target = getSpmhTarget(avgSalesByStore(row).value ?? 0);
  const actual = safeDiv(num(row, "infs_vta_actual"), num(row, "syr_crew_hr") + num(row, "syr_mngr_hr"));
  return { value: target, pct: actual };
}

export function tpmh(row: NumericRow): KpiResult {
  return { value: safeDiv(num(row, "syr_trans_hr"), num(row, "syr_crew_hr") + num(row, "syr_mngr_hr")) };
}

export function cashPlusMinus(row: NumericRow): KpiResult {
  const value = num(row, "syr_cash_mm");
  const pct = safeDiv(Math.abs(value), num(row, "infs_vta_actual"));
  return { value, pct, color: withColor(pct, "cashPct") };
}

export function refunds(row: NumericRow): KpiResult {
  const value = num(row, "syr_mngr_void_amt");
  const pct = safeDiv(value, num(row, "syr_gross_sales"));
  return { value, pct, color: withColor(pct, "refundsPct") };
}

export function voids(row: NumericRow): KpiResult {
  const value = num(row, "syr_reg_void_amt");
  const pct = safeDiv(value, num(row, "infs_vta_actual"));
  return { value, pct, color: withColor(pct, "managerVoidsPct") };
}

export function mealReplacementQty(row: NumericRow): KpiResult {
  return { value: num(row, "syr_meal_replacement_qty") };
}

export function mealReplacementAmount(row: NumericRow): KpiResult {
  const value = -num(row, "syr_meal_replacement_amt");
  return { value, pct: safeDiv(value, num(row, "infs_vta_actual")) };
}

/* ------------------------------------------------------------------------ */
/* DAY PART 1 / 2 / 6                                                        */
/* ------------------------------------------------------------------------ */

export function dpSalesVsLastWeek(row: NumericRow, dp: DpNumber): KpiResult {
  const current = num(row, `syr_sal_dp${dp}`);
  const lw = num(row, `syr_sal_dp${dp}_lw`);
  const value = current - lw;
  return { value, pct: safeDiv(value, lw) };
}

export function dp1SalesVsLYComp(row: NumericRow): KpiResult {
  const cmp = num(row, "syr_sal_dp1_cmp");
  const ly = num(row, "syr_sal_dp1_ly");
  const value = cmp - ly;
  return { value, pct: safeDiv(value, ly) };
}

export function dp1SalesVsLY(row: NumericRow): KpiResult {
  const current = num(row, "syr_sal_dp1");
  const ly = num(row, "syr_sal_dp1_ly");
  const value = current - ly;
  return { value, pct: safeDiv(value, ly) };
}

/** DP2/DP6 Sales vs LY: usa el comparativo (cmp), a diferencia de DP1 que usa el valor actual. */
export function dpSalesVsLY(row: NumericRow, dp: 2 | 6): KpiResult {
  const cmp = num(row, `syr_sal_dp${dp}_cmp`);
  const ly = num(row, `syr_sal_dp${dp}_ly`);
  const value = cmp - ly;
  return { value, pct: safeDiv(value, ly) };
}

export function dpCarCountVsLastWeek(row: NumericRow, dp: DpNumber): KpiResult {
  const current = num(row, `car_count_dp${dp}`);
  const lw = num(row, `car_count_dp${dp}_lw`);
  const value = current - lw;
  return { value, pct: safeDiv(value, lw) };
}

export function breakfastLaborHr(row: NumericRow): KpiResult {
  return { value: num(row, "hr_labor_dp1") };
}

/**
 * Breakfast Labor $ (DP1): syr_labor / syr_crew_hr * SUM(hr_labor_dp1), dividido por Sales DP1.
 * SUM(hr_labor_dp1) viene de `hr_labor_dp1_sum`, expuesto por `aggregateRows` porque
 * hr_labor_dp1 normalmente se agrega por PROMEDIO pero este KPI necesita la SUMA cruda.
 */
export function breakfastLaborDollars(row: NumericRow): KpiResult {
  const rate = safeDiv(num(row, "syr_labor"), num(row, "syr_crew_hr"));
  const laborDp1Sum = row["hr_labor_dp1_sum"] ?? num(row, "hr_labor_dp1");
  const value = rate === undefined ? undefined : rate * laborDp1Sum;
  return { value, pct: value === undefined ? undefined : safeDiv(value, num(row, "syr_sal_dp1")) };
}

/**
 * Breakfast Labor vs Guide %. Anomalía 3 corregida: divide por hr_guide_dp1
 * (en el Excel original dividía por una celda incorrecta). Equivale a `dpLaborVsGuide(row, 1)`.
 */
export function breakfastLaborVsGuidePct(row: NumericRow): KpiResult {
  return dpLaborVsGuide(row, 1);
}

function osatFor(overall: number, count: number): number | undefined {
  return safeDiv(overall, count);
}

export function dpOsat(row: NumericRow, dp: 1 | 2 | 4 | 6): KpiResult {
  const pct = osatFor(num(row, `smg_overall_dp${dp}`), num(row, `smg_count_dp${dp}`));
  return { value: undefined, pct, color: withColor(pct, "osatPct") };
}

export function dpZod(row: NumericRow, dp: 1 | 2 | 4 | 6): KpiResult {
  const pct = safeDiv(num(row, `smg_defzone_dp${dp}`), num(row, `smg_count_dp${dp}`));
  return { value: undefined, pct, color: withColor(pct, "zodPct") };
}

export function dpProblemResolution(row: NumericRow, dp: 1 | 2 | 4 | 6): KpiResult {
  const pct = safeDiv(num(row, `smg_problemsol_dp${dp}`), num(row, `smg_problemsol_count_dp${dp}`));
  return { value: undefined, pct, color: withColor(pct, "problemResolutionPct") };
}

/* ------------------------------------------------------------------------ */
/* SMG - CUSTOMER FEEDBACK (general)                                         */
/* ------------------------------------------------------------------------ */

export function osat(row: NumericRow): KpiResult {
  const pct = safeDiv(num(row, "smg_overall"), num(row, "smg_count"));
  return { value: undefined, pct, color: withColor(pct, "osatPct") };
}

export function zod(row: NumericRow): KpiResult {
  const pct = safeDiv(num(row, "smg_def_zone"), num(row, "smg_count"));
  return { value: undefined, pct, color: withColor(pct, "zodPct") };
}

export function problemResolution(row: NumericRow): KpiResult {
  const pct = safeDiv(num(row, "smg_problemsol"), num(row, "smg_problemsol_count"));
  return { value: undefined, pct, color: withColor(pct, "problemResolutionPct") };
}

/* ------------------------------------------------------------------------ */
/* RAW MATERIAL COST                                                         */
/* ------------------------------------------------------------------------ */

export function foodActual(row: NumericRow): KpiResult {
  const value = num(row, "syr_comida_costo_actual");
  return { value, pct: safeDiv(value, num(row, "infs_vta_actual")) };
}

export function foodIdealVar(row: NumericRow): KpiResult {
  const value = num(row, "syr_comida_costo_teorico") - num(row, "syr_comida_costo_actual");
  return { value, pct: safeDiv(value, num(row, "infs_vta_actual")) };
}

export function paperActual(row: NumericRow): KpiResult {
  const value = num(row, "syr_papel_costo_actual");
  return { value, pct: safeDiv(value, num(row, "infs_vta_actual")) };
}

export function paperIdealVar(row: NumericRow): KpiResult {
  const value = num(row, "syr_papel_costo_teorico") - num(row, "syr_papel_costo_actual");
  return { value, pct: safeDiv(value, num(row, "infs_vta_actual")) };
}

export function foodPaperActual(row: NumericRow): KpiResult {
  const value = (foodActual(row).value ?? 0) + (paperActual(row).value ?? 0);
  return { value, pct: safeDiv(value, num(row, "infs_vta_actual")) };
}

export function foodPaperVar(row: NumericRow): KpiResult {
  const value = (foodIdealVar(row).value ?? 0) + (paperIdealVar(row).value ?? 0);
  return { value, pct: safeDiv(value, num(row, "infs_vta_actual")) };
}

export function waste(row: NumericRow): KpiResult {
  const value = num(row, "syr_waste");
  return { value, pct: safeDiv(value, num(row, "infs_vta_actual")) };
}
