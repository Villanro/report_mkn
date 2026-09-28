import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { HierarchyNode, KpiColor, KpiResult } from "@/types";
import type { HierarchyColumn } from "@/lib/hierarchyTree";
import { cellClasses, dotClasses } from "@/lib/color";
import { formatCount, formatMoney, formatPercent, formatSeconds } from "@/lib/format";

interface HierarchyTableProps {
  columns: HierarchyColumn[];
  rows: HierarchyNode[];
}

const COLOR_PRIORITY: Record<Exclude<KpiColor, null>, number> = {
  red: 3,
  yellow: 2,
  green: 1,
};

/**
 * Peor color entre las métricas propias de la fila Y todo su subárbol. Así, un grupo
 * colapsado (p.ej. un Área) igual muestra el punto rojo/amarillo si algo dentro (una
 * Tienda) necesita atención — sin esto habría que expandir todo para notarlo.
 */
function subtreeWorstColor(row: HierarchyNode): KpiColor | undefined {
  let worst: KpiColor | undefined;
  for (const metric of Object.values(row.metrics)) {
    const color = metric?.color;
    if (color && (!worst || COLOR_PRIORITY[color] > COLOR_PRIORITY[worst])) worst = color;
  }
  for (const child of row.children ?? []) {
    const color = subtreeWorstColor(child);
    if (color && (!worst || COLOR_PRIORITY[color] > COLOR_PRIORITY[worst])) worst = color;
  }
  return worst;
}

/** Tinte de fondo por nivel jerárquico (independiente del color de estado) para que la
 * profundidad se lea de un vistazo, no solo por la indentación. Store alterna zebra por
 * índice entre hermanos — es el nivel con más filas y el que más hace falta escanear. */
function levelRowBg(row: HierarchyNode, siblingIndex: number): string {
  switch (row.level) {
    case "division":
      return "bg-slate-100";
    case "area":
      return "bg-slate-50";
    case "district":
      return "bg-white";
    case "store":
    default:
      return siblingIndex % 2 === 1 ? "bg-slate-50/70" : "bg-white";
  }
}

const LEVEL_LABEL_CLASSES: Record<HierarchyNode["level"], string> = {
  division: "text-[13px] font-bold uppercase tracking-wide text-gray-800",
  area: "text-sm font-semibold text-gray-800",
  district: "text-sm font-medium text-gray-700",
  store: "text-sm font-normal text-gray-700",
};

/** Varios KPIs (OSAT/ZOD/Problem Resolution) solo llenan `pct`, nunca `value` — ver
 * backend/src/kpis.ts (dpOsat/dpZod/dpProblemResolution devuelven value:undefined). No
 * se puede descartar la celda por `result.value === undefined`: hay que mirar el campo
 * que realmente usa el `format` de esta columna (value para $/#/seg, pct para %). */
function formatKpi(result: KpiResult | undefined, format: HierarchyColumn["format"]) {
  if (!result) return { text: "", color: undefined };
  const raw = format === "percent" ? (result.pct ?? result.value) : result.value;
  if (raw === undefined) return { text: "", color: undefined };
  const text =
    format === "percent"
      ? formatPercent(raw)
      : format === "seconds"
        ? formatSeconds(raw)
        : format === "number"
          ? formatCount(raw)
          : formatMoney(raw);
  return { text, color: result.color };
}

function Row({
  row,
  depth,
  siblingIndex,
  columns,
}: {
  row: HierarchyNode;
  depth: number;
  siblingIndex: number;
  columns: HierarchyColumn[];
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = !!row.children?.length;
  const navigate = useNavigate();
  const rowBg = levelRowBg(row, siblingIndex);
  const status = subtreeWorstColor(row);

  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-100/60 ${rowBg}`}>
        <td
          className={`sticky left-0 z-[1] py-1.5 pr-2 ${rowBg}`}
          style={{ paddingLeft: `${8 + depth * 20}px` }}
        >
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="w-4 shrink-0 text-gray-400 hover:text-gray-700"
                aria-label={expanded ? "Colapsar" : "Expandir"}
              >
                {expanded ? "▾" : "▸"}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${status ? dotClasses(status) : "bg-transparent"}`}
              aria-hidden
            />
            {row.level === "store" ? (
              <button
                type="button"
                className="text-left text-sm font-normal text-blue-700 hover:underline"
                onClick={() => navigate(`/store/${encodeURIComponent(row.label)}`)}
              >
                {row.label}
              </button>
            ) : (
              <span className={LEVEL_LABEL_CLASSES[row.level]}>{row.label}</span>
            )}
          </div>
        </td>
        {columns.map((col) => {
          const { text, color } = formatKpi(row.metrics[col.key], col.format);
          return (
            <td
              key={col.id ?? col.key}
              className={`whitespace-nowrap px-3 py-1.5 text-right text-sm tabular-nums ${cellClasses(color)}`}
            >
              {text}
            </td>
          );
        })}
      </tr>
      {expanded &&
        row.children?.map((child, i) => (
          <Row key={child.id} row={child} depth={depth + 1} siblingIndex={i} columns={columns} />
        ))}
    </>
  );
}

/**
 * Tabla jerárquica expandible (División > Área > Distrito > Tienda), reutilizable
 * en All Detail, DP1/DP2/DP6, Delivery y SOS. Encabezado y primera columna fijos.
 * El punto de color junto a cada etiqueta resume el peor estado de esa fila Y de todo
 * su subárbol (ver subtreeWorstColor), para poder detectar un problema sin expandir todo.
 */
export function HierarchyTable({ columns, rows }: HierarchyTableProps) {
  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border border-gray-200 shadow-sm print:max-h-none print:overflow-visible print:shadow-none">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-[2]">
          <tr>
            <th className="sticky left-0 z-[3] min-w-[240px] border-b border-gray-300 bg-gray-100 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              Jerarquía
            </th>
            {columns.map((col) => (
              <th
                key={col.id ?? col.key}
                className="whitespace-nowrap border-b border-gray-300 bg-gray-100 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <Row key={row.id} row={row} depth={0} siblingIndex={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
