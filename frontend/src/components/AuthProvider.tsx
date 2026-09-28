import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthState } from "@/lib/useAuth";
import { fetchMe, login as apiLogin, logout as apiLogout } from "@/lib/api";
import type { AuthUser } from "@/types";

/**
 * Todos los endpoints (salvo POST /api/login) requieren la cookie httpOnly del JWT
 * (backend/src/app.ts: requireAuth). Al montar, se intenta GET /api/me; un 401 es el
 * estado normal de "no logueado" (no un error a mostrar).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const state: AuthState = {
    user,
    loading,
    login: async (username, password) => {
      const u = await apiLogin(username, password);
      setUser(u);
    },
    logout: async () => {
      await apiLogout();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
