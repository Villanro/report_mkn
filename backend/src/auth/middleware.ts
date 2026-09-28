import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "./jwt.js";

export const AUTH_COOKIE_NAME = "bsc_token";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { username: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  const payload = typeof token === "string" ? verifyAuthToken(token) : undefined;
  if (!payload) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  req.user = { username: payload.username };
  next();
}
