import { useOutletContext } from "react-router-dom";
import type { FiltersContext } from "@/lib/useFilters";
import type { DayInfo, HierarchyGroup, HierarchyNode, HierarchySectionKey } from "@/types";
import { fetchDays, fetchHierarchy } from "@/lib/api";
import { buildHierarchyTree, HIERARCHY_COLUMNS } from "@/lib/hierarchyTree";
import { useApiData } from "@/lib/useApiData";
import { useDaySelection } from "@/lib/useDaySelection";
import { DaySelector } from "@/components/DaySelector";
import { HierarchyTable } from "@/components/HierarchyTable";
import { ErrorMessage } from "@/components/ErrorMessage";

interface HierarchySectionProps {
  title: string;
  section: HierarchySectionKey;
}

/**
 * Pantalla genérica con selector de día + tabla jerárquica, reutilizada por
 * All Detail, DP1/DP2/DP6 y Delivery. Pide los 3 niveles válidos de /api/hierarchy
 * (area, district, store) en paralelo y arma el árbol completo en el cliente
 * (ver lib/hierarchyTree.ts — el backend no anida).
 */
export default function HierarchySection({
  title,
  section,
}: HierarchySectionProps) {
  const { selection } = useOutletContext<FiltersContext>();
  const { days, day, setDay, daysError } = useDaySelection(fetchDays);

  const { data: levels, error } = useApiData<
    [HierarchyGroup[], HierarchyGroup[], HierarchyGroup[]]
  >(
    () =>
      day
        ? Promise.all([
            fetchHierarchy(day, "area", section, selection),
            fetchHierarchy(day, "district", section, selection),
            fetchHierarchy(day, "store", section, selection),
          ])
        : Promise.resolve([[], [], []] as [HierarchyGroup[], HierarchyGroup[], HierarchyGroup[]]),
    [day, section, JSON.stringify(selection)]
  );

  const tree: HierarchyNode[] | null = levels
    ? buildHierarchyTree(levels[0], levels[1], levels[2])
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        <DaySelector days={days} value={day} onChange={setDay} />
      </div>
      {daysError && <ErrorMessage message={daysError} />}
      {!daysError && error && <ErrorMessage message={error} />}
      {!daysError && !error && !tree && <p className="text-sm text-gray-500">Cargando…</p>}
      {!daysError && tree && <HierarchyTable columns={HIERARCHY_COLUMNS[section]} rows={tree} />}
    </div>
  );
}
