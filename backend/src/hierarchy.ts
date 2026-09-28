import type { OrdsRow } from "./types/ordsRow.js";
import { aggregateRows } from "./aggregate.js";
import * as kpis from "./kpis.js";
import type { KpiResult, NumericRow } from "./kpis.js";

export type HierarchyLevel = "area" | "district" | "store";
export type HierarchySection = "detail" | "dp1" | "dp2" | "dp6" | "delivery" | "sos";

export interface HierarchyGroup {
  division: string;
  area: string;
  district?: string;
  store?: string;
  metrics: Record<string, KpiResult>;
}

function groupKey(row: OrdsRow, level: HierarchyLevel): string {
  const parts = [row.division, row.area];
  if (level === "district" || level === "store") parts.push(row.district);
  if (level === "store") parts.push(row.store);
  return parts.join("␟");
}

function computeMetrics(row: NumericRow, section: HierarchySection): Record<string, KpiResult> {
  switch (section) {
    case "detail":
      return {
        grossSales: kpis.grossSales(row),
        netSales: kpis.netSales(row),
        dp1Sales: kpis.dpSales(row, 1),
        dp2Sales: kpis.dpSales(row, 2),
        dp3Sales: kpis.dpSales(row, 3),
        dp4Sales: kpis.dpSales(row, 4),
        dp5Sales: kpis.dpSales(row, 5),
        dp6Sales: kpis.dpSales(row, 6),
      };
    case "dp1":
      return {
        dpSales: kpis.dpSales(row, 1),
        dpSalesVsLastWeek: kpis.dpSalesVsLastWeek(row, 1),
        dp1SalesVsLYComp: kpis.dp1SalesVsLYComp(row),
        dp1SalesVsLY: kpis.dp1SalesVsLY(row),
        laborVsGuide: kpis.dpLaborVsGuide(row, 1),
        breakfastLaborHr: kpis.breakfastLaborHr(row),
        breakfastLaborDollars: kpis.breakfastLaborDollars(row),
        breakfastLaborVsGuidePct: kpis.breakfastLaborVsGuidePct(row),
        dpServiceTime: kpis.dpServiceTime(row, 1),
        dpCarCount: kpis.dpCarCount(row, 1),
        dpCarCountVsLastWeek: kpis.dpCarCountVsLastWeek(row, 1),
        osat: kpis.dpOsat(row, 1),
        zod: kpis.dpZod(row, 1),
        problemResolution: kpis.dpProblemResolution(row, 1),
      };
    case "dp2":
      return {
        dpSales: kpis.dpSales(row, 2),
        dpSalesVsLastWeek: kpis.dpSalesVsLastWeek(row, 2),
        dpSalesVsLY: kpis.dpSalesVsLY(row, 2),
        laborVsGuide: kpis.dpLaborVsGuide(row, 2),
        dpServiceTime: kpis.dpServiceTime(row, 2),
        dpCarCount: kpis.dpCarCount(row, 2),
        dpCarCountVsLastWeek: kpis.dpCarCountVsLastWeek(row, 2),
        osat: kpis.dpOsat(row, 2),
        zod: kpis.dpZod(row, 2),
        problemResolution: kpis.dpProblemResolution(row, 2),
      };
    case "dp6":
      return {
        dpSales: kpis.dpSales(row, 6),
        dpSalesVsLastWeek: kpis.dpSalesVsLastWeek(row, 6),
        dpSalesVsLY: kpis.dpSalesVsLY(row, 6),
        laborVsGuide: kpis.dpLaborVsGuide(row, 6),
        dpServiceTime: kpis.dpServiceTime(row, 6),
        dpCarCount: kpis.dpCarCount(row, 6),
        dpCarCountVsLastWeek: kpis.dpCarCountVsLastWeek(row, 6),
        osat: kpis.dpOsat(row, 6),
        zod: kpis.dpZod(row, 6),
        problemResolution: kpis.dpProblemResolution(row, 6),
      };
    case "delivery":
      return { deliverySales: kpis.deliverySales(row) };
    case "sos":
      return { serviceTime: kpis.serviceTime(row) };
  }
}

/** Agrupa `rows` (ya filtradas por día y por los filtros activos) al nivel pedido y calcula las métricas de `section`. */
export function buildHierarchy(rows: OrdsRow[], level: HierarchyLevel, section: HierarchySection): HierarchyGroup[] {
  const groups = new Map<string, OrdsRow[]>();
  for (const row of rows) {
    const key = groupKey(row, level);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  const result: HierarchyGroup[] = [];
  for (const groupRows of groups.values()) {
    const first = groupRows[0];
    const aggregated = aggregateRows(groupRows);
    result.push({
      division: first.division,
      area: first.area,
      district: level === "district" || level === "store" ? first.district : undefined,
      store: level === "store" ? first.store : undefined,
      metrics: computeMetrics(aggregated, section),
    });
  }

  result.sort((a, b) => {
    const key = (g: HierarchyGroup) => [g.division, g.area, g.district ?? "", g.store ?? ""].join("␟");
    return key(a).localeCompare(key(b));
  });
  return result;
}
