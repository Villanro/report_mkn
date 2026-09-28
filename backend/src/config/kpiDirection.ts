/**
 * Dirección de "mejor" para los KPIs de kpis.ts que NO tienen reglas de color
 * (colorThresholds.ts). Para los que sí tienen color, rojo=peor ya es la fuente
 * de verdad de negocio y `rank_stores` debe seguir usando esa lógica en vez de
 * esta tabla.
 *
 * Clave = nombre de la función exportada en kpis.ts. Un KPI ausente de esta
 * tabla es porque tiene color propio (ver colorThresholds.ts).
 */

export type KpiDirection = "higherIsBetter" | "lowerIsBetter";

export const KPI_DIRECTIONS: Record<string, KpiDirection> = {
  // --- Ventas / volumen: más alto = mejor ---
  grossSales: "higherIsBetter",
  netSales: "higherIsBetter",
  dpSales: "higherIsBetter",
  puwSales: "higherIsBetter",
  deliverySales: "higherIsBetter",
  upsizePct: "higherIsBetter",
  kioskTotalSales: "higherIsBetter",
  kioskSales: "higherIsBetter",
  toGoSales: "higherIsBetter",
  mobileTotalSales: "higherIsBetter",
  mobileInSales: "higherIsBetter",
  mobileToGoSales: "higherIsBetter",
  mobilePuwSales: "higherIsBetter",
  handheldSales: "higherIsBetter",
  avgSalesByStore: "higherIsBetter",
  salesVs2YearAgo: "higherIsBetter",
  salesWTD: "higherIsBetter",
  salesWTDLastYear: "higherIsBetter",
  salesPTD: "higherIsBetter",
  salesPTDLastYear: "higherIsBetter",
  salesYTD: "higherIsBetter",
  salesYTDLastYear: "higherIsBetter",
  dpSalesVsLastWeek: "higherIsBetter",
  dp1SalesVsLYComp: "higherIsBetter",
  dp1SalesVsLY: "higherIsBetter",
  dpSalesVsLY: "higherIsBetter",

  // --- Transacciones / tráfico: más alto = mejor ---
  transactions: "higherIsBetter",
  avgTransByStore: "higherIsBetter",
  kioskTransactions: "higherIsBetter",
  kioskInTrans: "higherIsBetter",
  kioskToGoTrans: "higherIsBetter",
  mobileTransactions: "higherIsBetter",
  mobileInTrans: "higherIsBetter",
  mobileToGoTrans: "higherIsBetter",
  mobilePuwTrans: "higherIsBetter",
  handheldTransactions: "higherIsBetter",
  ticketAverage: "higherIsBetter",
  ticketAverageLastYear: "higherIsBetter",
  carCount: "higherIsBetter",
  dpCarCount: "higherIsBetter",
  dpCarCountVsLastWeek: "higherIsBetter",

  // --- Productividad de labor: más alto = mejor ---
  spmhTargetVsActual: "higherIsBetter",
  tpmh: "higherIsBetter",

  // --- Horas / costo de labor por encima de guía: más bajo = mejor ---
  // (laborHrGuide y laborPctTargetVsActual ya tienen color propio y no están acá)
  dpLaborVsGuide: "lowerIsBetter",
  avgLaborHrGuide: "lowerIsBetter",
  laborCrewPct: "lowerIsBetter",
  laborSsvPct: "lowerIsBetter",
  laborManagerPct: "lowerIsBetter",
  wtdOvertimeHrPct: "lowerIsBetter",
  breakfastLaborHr: "lowerIsBetter",
  breakfastLaborDollars: "lowerIsBetter",
  breakfastLaborVsGuidePct: "lowerIsBetter",

  // --- Costos / mermas: más bajo = mejor ---
  mealReplacementQty: "lowerIsBetter",
  mealReplacementAmount: "lowerIsBetter",
  foodActual: "lowerIsBetter",
  paperActual: "lowerIsBetter",
  foodPaperActual: "lowerIsBetter",
  waste: "lowerIsBetter",

  // --- Varianzas de costo (teórico - actual): un valor MÁS ALTO significa que
  // el costo actual quedó por debajo del teórico (buen control de costo) ---
  foodIdealVar: "higherIsBetter",
  paperIdealVar: "higherIsBetter",
  foodPaperVar: "higherIsBetter",
};

export function getKpiDirection(kpiName: string): KpiDirection | undefined {
  return KPI_DIRECTIONS[kpiName];
}
