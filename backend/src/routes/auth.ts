import { Router } from "express";
import { verifyCredentials } from "../auth/users.js";
import { signAuthToken } from "../auth/jwt.js";
import { AUTH_COOKIE_NAME, requireAuth } from "../auth/middleware.js";

export const authRouter = Router();

const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "username y password son requeridos" });
    return;
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    return;
  }

  const token = signAuthToken({ username: user.username });
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_MS,
  });
  res.json({ username: user.username });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ username: req.user?.username });
});
