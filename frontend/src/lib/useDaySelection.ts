import { useEffect, useState } from "react";
import type { DayInfo } from "@/types";
import { ApiError } from "@/lib/api";

/** Carga GET /api/days y selecciona el más reciente por defecto; expone el error si falla
 * en vez de dejar el selector vacío sin explicación (ver ErrorMessage en las pantallas). */
export function useDaySelection(fetchDays: () => Promise<DayInfo[]>) {
  const [days, setDays] = useState<DayInfo[]>([]);
  const [day, setDay] = useState<string>("");
  const [daysError, setDaysError] = useState<string | null>(null);

  useEffect(() => {
    fetchDays()
      .then((d) => {
        setDays(d);
        setDaysError(null);
        if (d.length > 0) setDay(d[d.length - 1].bsc_fecha);
      })
      .catch((err) => {
        setDaysError(err instanceof ApiError ? err.message : "Error de conexión con el backend");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { days, day, setDay, daysError };
}
