import { useOutletContext } from "react-router-dom";
import type { FiltersContext } from "@/lib/useFilters";
import type { BscResponse } from "@/types";
import { fetchBsc } from "@/lib/api";
import { useApiData } from "@/lib/useApiData";
import { BscTable } from "@/components/BscTable";
import { ErrorMessage } from "@/components/ErrorMessage";

export default function BscMain() {
  const { selection } = useOutletContext<FiltersContext>();
  const { data, error } = useApiData<BscResponse>(
    () => fetchBsc(selection),
    [JSON.stringify(selection)]
  );

  if (error) return <ErrorMessage message={error} />;
  if (!data) return <p className="text-sm text-gray-500">Cargando…</p>;

  return <BscTable data={data} />;
}
