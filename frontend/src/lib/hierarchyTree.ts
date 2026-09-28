import type {
  HierarchyGroup,
  HierarchyNode,
  HierarchySectionKey,
} from "@/types";

export type ColumnFormat = "money" | "percent" | "seconds" | "number";

export interface HierarchyColumn {
  /** clave de `row.metrics` a leer (puede repetirse: p.ej. deliverySales.value y .pct en dos columnas). */
  key: string;
  /** identificador único de columna para listas de React; por defecto = key. */
  id?: string;
  label: string;
  format: ColumnFormat;
}

/**
 * Columnas por sección, en el orden y con las claves EXACTAS que devuelve
 * backend/src/hierarchy.ts (computeMetrics). El backend no manda labels ni
 * formato: los definimos aquí, del lado del cliente.
 */
export const HIERARCHY_COLUMNS: Record<HierarchySectionKey, HierarchyColumn[]> = {
  detail: [
    { key: "grossSales", label: "Gross Sales", format: "money" },
    { key: "netSales", label: "Net Sales", format: "money" },
    { key: "dp1Sales", label: "DP1 Sales", format: "money" },
    { key: "dp2Sales", label: "DP2 Sales", format: "money" },
    { key: "dp3Sales", label: "DP3 Sales", format: "money" },
    { key: "dp4Sales", label: "DP4 Sales", format: "money" },
    { key: "dp5Sales", label: "DP5 Sales", format: "money" },
    { key: "dp6Sales", label: "DP6 Sales", format: "money" },
  ],
  dp1: [
    { key: "dpSales", label: "DP1 Sales", format: "money" },
    { key: "dpSalesVsLastWeek", label: "DP1 Sales vs Last Week", format: "money" },
    { key: "dp1SalesVsLYComp", label: "DP1 Sales vs LY Comp.", format: "money" },
    { key: "dp1SalesVsLY", label: "DP1 Sales vs LY", format: "money" },
    { key: "laborVsGuide", label: "Labor vs Guide +/-", format: "number" },
    { key: "breakfastLaborHr", label: "Breakfast Labor Hr #", format: "number" },
    { key: "breakfastLaborDollars", label: "Breakfast Labor $", format: "money" },
    { key: "breakfastLaborVsGuidePct", label: "Breakfast Labor vs Guide %", format: "percent" },
    { key: "dpServiceTime", label: "DP1 Service Time", format: "seconds" },
    { key: "dpCarCount", label: "DP1 Car Count", format: "number" },
    { key: "dpCarCountVsLastWeek", label: "DP1 Car Count vs LW", format: "number" },
    { key: "osat", label: "OSAT", format: "percent" },
    { key: "zod", label: "ZOD", format: "percent" },
    { key: "problemResolution", label: "Problem Resolution", format: "percent" },
  ],
  dp2: [
    { key: "dpSales", label: "DP2 Sales", format: "money" },
    { key: "dpSalesVsLastWeek", label: "DP2 Sales vs Last Week", format: "money" },
    { key: "dpSalesVsLY", label: "DP2 Sales vs LY", format: "money" },
    { key: "laborVsGuide", label: "Labor vs Guide +/-", format: "number" },
    { key: "dpServiceTime", label: "DP2 Service Time", format: "seconds" },
    { key: "dpCarCount", label: "DP2 Car Count", format: "number" },
    { key: "dpCarCountVsLastWeek", label: "DP2 Car Count vs LW", format: "number" },
    { key: "osat", label: "OSAT", format: "percent" },
    { key: "zod", label: "ZOD", format: "percent" },
    { key: "problemResolution", label: "Problem Resolution", format: "percent" },
  ],
  dp6: [
    { key: "dpSales", label: "DP6 Sales", format: "money" },
    { key: "dpSalesVsLastWeek", label: "DP6 Sales vs Last Week", format: "money" },
    { key: "dpSalesVsLY", label: "DP6 Sales vs LY", format: "money" },
    { key: "laborVsGuide", label: "Labor vs Guide +/-", format: "number" },
    { key: "dpServiceTime", label: "DP6 Service Time", format: "seconds" },
    { key: "dpCarCount", label: "DP6 Car Count", format: "number" },
    { key: "dpCarCountVsLastWeek", label: "DP6 Car Count vs LW", format: "number" },
    { key: "osat", label: "OSAT", format: "percent" },
    { key: "zod", label: "ZOD", format: "percent" },
    { key: "problemResolution", label: "Problem Resolution", format: "percent" },
  ],
  delivery: [
    { key: "deliverySales", id: "deliverySalesValue", label: "Delivery $", format: "money" },
    { key: "deliverySales", id: "deliverySalesPct", label: "Delivery %", format: "percent" },
  ],
  sos: [{ key: "serviceTime", label: "Service Time", format: "seconds" }],
};

function keyOf(division: string, area: string, district?: string, store?: string): string {
  return [division, area, district, store].filter((v) => v !== undefined).join("␟");
}

/**
 * Reconstruye el árbol Área > Distrito > Tienda (agrupado visualmente por División) a
 * partir de TRES respuestas planas de GET /api/hierarchy, una por cada `level` válido
 * (area, district, store). El backend NO anida ni ofrece un nivel "division": agrupa
 * exactamente al nivel pedido, ya agregado con aggregateRows (SUMA/PROMEDIO correctos
 * según docs/spec-bsc.md — nunca se re-suman ratios ni promedios en el cliente). Por eso
 * pedimos los 3 niveles en paralelo en vez de aplanar solo "store" y sumar aquí.
 */
export function buildHierarchyTree(
  areaGroups: HierarchyGroup[],
  districtGroups: HierarchyGroup[],
  storeGroups: HierarchyGroup[]
): HierarchyNode[] {
  const districtByKey = new Map(
    districtGroups.map((g) => [keyOf(g.division, g.area, g.district), g])
  );
  const storesByDistrictKey = new Map<string, HierarchyGroup[]>();
  for (const g of storeGroups) {
    const dKey = keyOf(g.division, g.area, g.district);
    const bucket = storesByDistrictKey.get(dKey) ?? [];
    bucket.push(g);
    storesByDistrictKey.set(dKey, bucket);
  }

  const divisions = new Map<string, HierarchyGroup[]>();
  for (const g of areaGroups) {
    const bucket = divisions.get(g.division) ?? [];
    bucket.push(g);
    divisions.set(g.division, bucket);
  }

  const tree: HierarchyNode[] = [];
  for (const [division, areas] of divisions) {
    const areaNodes: HierarchyNode[] = areas.map((areaGroup) => {
      const districtNodes: HierarchyNode[] = [...districtByKey.values()]
        .filter((d) => d.division === division && d.area === areaGroup.area)
        .map((districtGroup) => {
          const dKey = keyOf(districtGroup.division, districtGroup.area, districtGroup.district);
          const storeNodes: HierarchyNode[] = (storesByDistrictKey.get(dKey) ?? []).map((s) => ({
            id: keyOf(s.division, s.area, s.district, s.store),
            level: "store",
            label: s.store ?? "",
            metrics: s.metrics,
          }));
          return {
            id: dKey,
            level: "district",
            label: districtGroup.district ?? "",
            children: storeNodes,
            metrics: districtGroup.metrics,
          };
        });
      return {
        id: keyOf(division, areaGroup.area),
        level: "area",
        label: areaGroup.area,
        children: districtNodes,
        metrics: areaGroup.metrics,
      };
    });
    tree.push({
      id: division,
      level: "division",
      label: division,
      children: areaNodes,
      metrics: {},
    });
  }
  return tree;
}
