import { useParams } from "react-router-dom";
import type { BscResponse } from "@/types";
import { fetchBsc } from "@/lib/api";
import { useApiData } from "@/lib/useApiData";
import { BscTable } from "@/components/BscTable";
import { ErrorMessage } from "@/components/ErrorMessage";

/**
 * Detalle de tienda = BSC principal filtrado a una sola tienda (spec, pantalla 6).
 * No reutiliza el `selection` global de Layout/Outlet: fuerza store=[storeId] sin
 * importar qué otros filtros estén activos arriba, ya que la navegación llega desde
 * un clic en una fila de tienda de cualquier tabla jerárquica.
 */
export default function StoreDetail() {
  const { storeId } = useParams<{ storeId: string }>();
  const { data, error } = useApiData<BscResponse>(
    () => fetchBsc({ store: storeId ? [storeId] : [] }),
    [storeId]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Tienda: <span className="font-medium text-gray-700">{storeId}</span>
      </p>
      {error && <ErrorMessage message={error} />}
      {!error && !data && <p className="text-sm text-gray-500">Cargando…</p>}
      {data && <BscTable data={data} />}
    </div>
  );
}
