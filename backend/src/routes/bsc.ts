import { Router } from "express";
import { asyncHandler } from "../asyncHandler.js";
import { getRows } from "../ords/cache.js";
import { aggregateRows } from "../aggregate.js";
import { applyFilters, parseFilters } from "../query/filters.js";
import { resolveWeekDays } from "../date/week.js";
import { KPI_CATALOG } from "../kpiCatalog.js";
import type { OrdsRow } from "../types/ordsRow.js";

export const bscRouter = Router();

const VALIDATION_EPSILON = 0.01;

function sumNetSales(rows: OrdsRow[]): number {
  return rows.reduce((sum, row) => sum + (typeof row.infs_vta_actual === "number" ? row.infs_vta_actual : 0), 0);
}

/**
 * BSC principal: una fila por KPI del catálogo, una columna por día de la semana fiscal
 * resuelta (7 días, domingo a sábado, más antiguo -> más reciente).
 */
bscRouter.get(
  "/bsc",
  asyncHandler(async (req, res) => {
    const rows = await getRows();
    const filters = parseFilters(req.query as Record<string, unknown>);
    const dayParam = typeof req.query.day === "string" ? req.query.day : undefined;
    const weekDays = resolveWeekDays(rows, dayParam);

    const validation: Record<string, boolean> = {};
    const aggregatedByDay: Record<string, ReturnType<typeof aggregateRows>> = {};

    for (const day of weekDays) {
      const dayRows = rows.filter((row) => row.bsc_fecha === day.bsc_fecha);
      const filteredDayRows = applyFilters(dayRows, filters);
      const aggregated = aggregateRows(filteredDayRows);
      aggregatedByDay[day.bsc_fecha] = aggregated;

      const bscNetSales = typeof aggregated.infs_vta_actual === "number" ? aggregated.infs_vta_actual : 0;
      const totalFilteredNetSales = sumNetSales(filteredDayRows);
      validation[day.bsc_fecha] = Math.abs(bscNetSales - totalFilteredNetSales) > VALIDATION_EPSILON;
    }

    const kpiRows = KPI_CATALOG.map((entry) => ({
      key: entry.key,
      label: entry.label,
      section: entry.section,
      byDay: Object.fromEntries(
        weekDays.map((day) => [day.bsc_fecha, entry.compute(aggregatedByDay[day.bsc_fecha])]),
      ),
    }));

    res.json({ days: weekDays, kpis: kpiRows, validation });
  }),
);
