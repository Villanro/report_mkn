import { Router } from "express";
import { asyncHandler } from "../asyncHandler.js";
import { getRows } from "../ords/cache.js";
import { applyFilters, parseFilters } from "../query/filters.js";
import { buildHierarchy, type HierarchyLevel, type HierarchySection } from "../hierarchy.js";

export const hierarchyRouter = Router();

const VALID_LEVELS: HierarchyLevel[] = ["area", "district", "store"];
const VALID_SECTIONS: HierarchySection[] = ["detail", "dp1", "dp2", "dp6", "delivery", "sos"];

hierarchyRouter.get(
  "/hierarchy",
  asyncHandler(async (req, res) => {
    const { day, level, section } = req.query;

    if (typeof day !== "string") {
      res.status(400).json({ error: "day es requerido (bsc_fecha)" });
      return;
    }
    if (typeof level !== "string" || !VALID_LEVELS.includes(level as HierarchyLevel)) {
      res.status(400).json({ error: `level debe ser uno de: ${VALID_LEVELS.join(", ")}` });
      return;
    }
    if (typeof section !== "string" || !VALID_SECTIONS.includes(section as HierarchySection)) {
      res.status(400).json({ error: `section debe ser uno de: ${VALID_SECTIONS.join(", ")}` });
      return;
    }

    const rows = await getRows();
    const filters = parseFilters(req.query as Record<string, unknown>);
    const dayRows = applyFilters(
      rows.filter((row) => row.bsc_fecha === day),
      filters,
    );

    res.json(buildHierarchy(dayRows, level as HierarchyLevel, section as HierarchySection));
  }),
);
