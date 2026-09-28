import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
}

/** Ejecuta `fetcher` cada vez que cambia `deps`, exponiendo data/error en vez de dejar
 * la UI colgada en "Cargando…" cuando el backend falla (p.ej. ORDS caído). */
export function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetcher()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Error de conexión con el backend");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error };
}
