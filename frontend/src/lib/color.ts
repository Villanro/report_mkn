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

/**
 * Variante de `colorClasses` para celdas densas (BSC principal): añade un borde de acento
 * a la izquierda para que el estado se note incluso en vista periférica/escaneo rápido,
 * sin depender solo del tono pastel del fondo.
 */
export function cellClasses(color: KpiColor | null | undefined): string {
  switch (color) {
    case "green":
      return "border-l-2 border-kpi-green/40 bg-kpi-green-bg text-kpi-green";
    case "yellow":
      return "border-l-2 border-kpi-yellow/50 bg-kpi-yellow-bg text-kpi-yellow";
    case "red":
      return "border-l-2 border-kpi-red/50 bg-kpi-red-bg text-kpi-red";
    default:
      return "border-l-2 border-transparent text-gray-700";
  }
}

/** Color sólido (sin fondo pastel) para indicadores puntuales: leyenda y punto de estado por fila. */
export function dotClasses(color: Exclude<KpiColor, null> | undefined): string {
  switch (color) {
    case "green":
      return "bg-kpi-green";
    case "yellow":
      return "bg-kpi-yellow";
    case "red":
      return "bg-kpi-red";
    default:
      return "bg-gray-300";
  }
}
