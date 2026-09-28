import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { FiltersContext } from "@/lib/useFilters";
import type { HierarchyGroup } from "@/types";
import { fetchDays, fetchHierarchy } from "@/lib/api";
import { useApiData } from "@/lib/useApiData";
import { useDaySelection } from "@/lib/useDaySelection";
import { cellClasses, dotClasses } from "@/lib/color";
import { formatSeconds } from "@/lib/format";
import { DaySelector } from "@/components/DaySelector";
import { ErrorMessage } from "@/components/ErrorMessage";

type SosLevel = "area" | "district" | "store";

const LEVELS: { value: SosLevel; label: string }[] = [
  { value: "area", label: "Por Área (DAO)" },
  { value: "district", label: "Por Distrito (DM)" },
  { value: "store", label: "Por Tienda" },
];

/**
 * SOS tiene 3 niveles de vista (Área/DAO, Distrito/DM, Tienda) que se muestran como
 * tabla PLANA (no árbol expandible): cada fila ya es la agregación de service_time
 * (promedio) que devuelve GET /api/hierarchy para el `level` elegido.
 */
export default function Sos() {
  const { selection } = useOutletContext<FiltersContext>();
  const { days, day, setDay, daysError } = useDaySelection(fetchDays);
  const [level, setLevel] = useState<SosLevel>("district");

  const { data: rows, error } = useApiData<HierarchyGroup[]>(
    () => (day ? fetchHierarchy(day, level, "sos", selection) : Promise.resolve([])),
    [day, level, JSON.stringify(selection)]
  );

  const labelFor = (g: HierarchyGroup) => g.store ?? g.district ?? g.area;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-800">SOS — Service Time</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-gray-300 print:hidden">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLevel(l.value)}
                className={`px-3 py-1.5 text-sm ${
                  level === l.value
                    ? "bg-gray-800 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <DaySelector days={days} value={day} onChange={setDay} />
        </div>
      </div>
      {daysError && <ErrorMessage message={daysError} />}
      {!daysError && error && <ErrorMessage message={error} />}
      {!daysError && !error && !rows && <p className="text-sm text-gray-500">Cargando…</p>}
      {!daysError && rows && (
        <>
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 print:hidden">
            {(
              [
                { color: "green", label: "En objetivo" },
                { color: "yellow", label: "Atención" },
                { color: "red", label: "Acción requerida" },
              ] as const
            ).map(({ color, label }) => (
              <span key={color} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${dotClasses(color)}`} />
                {label}
              </span>
            ))}
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-lg border border-gray-200 shadow-sm print:max-h-none print:overflow-visible print:shadow-none">
            <table className="w-full border-separate border-spacing-0 text-sm tabular-nums">
              <thead className="sticky top-0 z-[2]">
                <tr>
                  <th className="sticky left-0 z-[3] min-w-[240px] border-b border-gray-300 bg-gray-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                    {LEVELS.find((l) => l.value === level)?.label}
                  </th>
                  <th className="border-b border-gray-300 bg-gray-100 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Service Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g, i) => {
                  const result = g.metrics.serviceTime;
                  const rowBg = i % 2 === 1 ? "bg-slate-50/70" : "bg-white";
                  return (
                    <tr key={i} className={`border-b border-gray-100 ${rowBg}`}>
                      <td className={`sticky left-0 z-[1] px-3 py-1.5 font-medium text-gray-700 ${rowBg}`}>
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              result?.color ? dotClasses(result.color) : "bg-transparent"
                            }`}
                            aria-hidden
                          />
                          {labelFor(g)}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold ${cellClasses(
                          result?.color
                        )}`}
                      >
                        {result?.value !== undefined ? formatSeconds(result.value) : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
