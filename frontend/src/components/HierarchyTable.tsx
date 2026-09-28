import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { HierarchyNode, KpiResult } from "@/types";
import type { HierarchyColumn } from "@/lib/hierarchyTree";
import { colorClasses } from "@/lib/color";
import { formatCount, formatMoney, formatPercent, formatSeconds } from "@/lib/format";

interface HierarchyTableProps {
  columns: HierarchyColumn[];
  rows: HierarchyNode[];
}

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
  columns,
}: {
  row: HierarchyNode;
  depth: number;
  columns: HierarchyColumn[];
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = !!row.children?.length;
  const navigate = useNavigate();

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td
          className="sticky left-0 z-[1] bg-white py-1.5 pr-2 text-sm"
          style={{ paddingLeft: `${8 + depth * 20}px` }}
        >
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="w-4 text-gray-500"
                aria-label={expanded ? "Colapsar" : "Expandir"}
              >
                {expanded ? "▾" : "▸"}
              </button>
            ) : (
              <span className="w-4" />
            )}
            {row.level === "store" ? (
              <button
                type="button"
                className="text-left text-blue-700 hover:underline"
                onClick={() => navigate(`/store/${encodeURIComponent(row.label)}`)}
              >
                {row.label}
              </button>
            ) : (
              <span className={depth === 0 ? "font-semibold" : ""}>{row.label}</span>
            )}
          </div>
        </td>
        {columns.map((col) => {
          const { text, color } = formatKpi(row.metrics[col.key], col.format);
          return (
            <td
              key={col.id ?? col.key}
              className={`whitespace-nowrap px-3 py-1.5 text-right text-sm ${colorClasses(color)}`}
            >
              {text}
            </td>
          );
        })}
      </tr>
      {expanded &&
        row.children?.map((child) => (
          <Row key={child.id} row={child} depth={depth + 1} columns={columns} />
        ))}
    </>
  );
}

/**
 * Tabla jerárquica expandible (División > Área > Distrito > Tienda), reutilizable
 * en All Detail, DP1/DP2/DP6, Delivery y SOS. Encabezado y primera columna fijos.
 */
export function HierarchyTable({ columns, rows }: HierarchyTableProps) {
  return (
    <div className="max-h-[70vh] overflow-auto rounded border border-gray-200 print:max-h-none print:overflow-visible">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-[2] bg-gray-100">
          <tr>
            <th className="sticky left-0 z-[3] bg-gray-100 px-2 py-2 text-left text-xs font-semibold uppercase text-gray-600">
              Jerarquía
            </th>
            {columns.map((col) => (
              <th
                key={col.id ?? col.key}
                className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row key={row.id} row={row} depth={0} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
