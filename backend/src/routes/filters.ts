import { Router } from "express";
import { asyncHandler } from "../asyncHandler.js";
import { getRows } from "../ords/cache.js";
import { applyFilters, FILTER_FIELD_MAP, FILTER_KEYS, parseFilters } from "../query/filters.js";

export const filtersRouter = Router();

/**
 * Valores únicos por filtro, en cascada: para cada categoría se calculan sus opciones
 * aplicando todos los DEMÁS filtros ya seleccionados (no el suyo propio), igual que una
 * segmentación de Excel.
 */
filtersRouter.get(
  "/filters",
  asyncHandler(async (req, res) => {
    const rows = await getRows();
    const selected = parseFilters(req.query as Record<string, unknown>);

    const result: Record<string, string[]> = {};
    for (const key of FILTER_KEYS) {
      const field = FILTER_FIELD_MAP[key];
      const scoped = applyFilters(rows, selected, key);
      const values = new Set<string>();
      for (const row of scoped) {
        const value = row[field];
        if (typeof value === "string" && value.length > 0) values.add(value);
      }
      result[key] = [...values].sort((a, b) => a.localeCompare(b));
    }

    res.json(result);
  }),
);
