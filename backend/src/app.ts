import type { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import express from "express";
import { requireAuth } from "./auth/middleware.js";
import { OrdsUnavailableError } from "./errors.js";
import { authRouter } from "./routes/auth.js";
import { bscRouter } from "./routes/bsc.js";
import { chatRouter } from "./routes/chat.js";
import { daysRouter } from "./routes/days.js";
import { filtersRouter } from "./routes/filters.js";
import { hierarchyRouter } from "./routes/hierarchy.js";
import { refreshRouter } from "./routes/refresh.js";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // El frontend nunca llama a ORDS directamente, solo a este backend.
  app.use("/api", authRouter);
  app.use("/api", requireAuth, daysRouter);
  app.use("/api", requireAuth, filtersRouter);
  app.use("/api", requireAuth, bscRouter);
  app.use("/api", requireAuth, hierarchyRouter);
  app.use("/api", requireAuth, refreshRouter);
  app.use("/api", requireAuth, chatRouter);

  // Error handler central: cualquier error que llegue vía next(err) (ver asyncHandler.ts)
  // se convierte en una respuesta JSON — nunca en un crash del proceso.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof OrdsUnavailableError) {
      console.error("[ords]", err.message, err.cause ?? "");
      res.status(502).json({ error: "ORDS unavailable" });
      return;
    }

    console.error("[unhandled]", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
