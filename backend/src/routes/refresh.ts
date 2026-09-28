import { Router } from "express";
import { invalidateCache } from "../ords/cache.js";

export const refreshRouter = Router();

/** Equivale a la macro "GetData" del Excel: invalida la caché para forzar un refetch de ORDS. */
refreshRouter.post("/refresh", (_req, res) => {
  invalidateCache();
  res.status(204).end();
});
