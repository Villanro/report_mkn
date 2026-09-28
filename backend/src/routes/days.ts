import { Router } from "express";
import { asyncHandler } from "../asyncHandler.js";
import { getRows } from "../ords/cache.js";
import { getAvailableDays } from "../date/week.js";

export const daysRouter = Router();

daysRouter.get(
  "/days",
  asyncHandler(async (_req, res) => {
    const rows = await getRows();
    res.json(getAvailableDays(rows));
  }),
);
