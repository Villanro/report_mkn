import { useEffect, useState } from "react";
import { fetchFilters } from "@/lib/api";
import { emptyFilterSelection } from "@/components/FilterBar";
import type { FilterOptions, FilterSelection } from "@/types";

const emptyOptions: FilterOptions = {
  company: [],
  division: [],
  area: [],
  district: [],
  store: [],
  building: [],
  region: [],
  careStatus: [],
};

/**
 * Estado de filtros compartido entre pantallas (via Outlet context de react-router).
 * Al cambiar `selection`, se re-consulta /api/filters para recalcular la cascada
 * (el backend recalcula las opciones de cada categoría excluyendo su propio filtro).
 */
export function useFilters() {
  const [options, setOptions] = useState<FilterOptions>(emptyOptions);
  const [selection, setSelection] = useState<FilterSelection>(
    emptyFilterSelection()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFilters(selection)
      .then((opts) => {
        if (!cancelled) {
          setOptions(opts);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar los filtros");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(selection)]);

  return { options, selection, setSelection, loading, error };
}

export type FiltersContext = ReturnType<typeof useFilters>;
