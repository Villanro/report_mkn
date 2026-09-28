import type { KpiColor } from "@/types";

/**
 * Mapea un color YA RESUELTO por el backend a clases Tailwind.
 * El frontend NO calcula umbrales; solo pinta lo que el backend decide (ver spec-bsc.md, sección "Reglas de color").
 */
export function colorClasses(color: KpiColor | null | undefined): string {
  switch (color) {
    case "green":
      return "bg-kpi-green-bg text-kpi-green";
    case "yellow":
      return "bg-kpi-yellow-bg text-kpi-yellow";
    case "red":
      return "bg-kpi-red-bg text-kpi-red";
    default:
      return "text-gray-700";
  }
}
