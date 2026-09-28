export type KpiColor = "green" | "yellow" | "red";

/** Resultado de un KPI ya calculado por el backend (backend/src/kpis.ts: KpiResult). */
export interface KpiResult {
  value: number | undefined;
  pct?: number | undefined;
  color?: KpiColor;
}

/** backend/src/date/week.ts: DayInfo */
export interface DayInfo {
  bsc_fecha: string;
  tie_bsc_descripcion: string;
  weekKey: string;
  /** tie_bsc_descripcion sin los 2 primeros caracteres */
  label: string;
}

export interface KpiCatalogRow {
  key: string;
  label: string;
  section: "operations" | "smg" | "raw_material";
  /** una entrada por bsc_fecha (clave = DayInfo.bsc_fecha) */
  byDay: Record<string, KpiResult>;
}

/** GET /api/bsc response real (backend/src/routes/bsc.ts) */
export interface BscResponse {
  days: DayInfo[];
  kpis: KpiCatalogRow[];
  /** clave = bsc_fecha; true = mismatch -> "VERIFICAR SELECTOR" ese día */
  validation: Record<string, boolean>;
}

export interface FilterOptions {
  company: string[];
  division: string[];
  area: string[];
  district: string[];
  store: string[];
  building: string[];
  region: string[];
  careStatus: string[];
}

export interface FilterSelection {
  company: string[];
  division: string[];
  area: string[];
  district: string[];
  store: string[];
  building: string[];
  region: string[];
  careStatus: string[];
}

export type HierarchyLevel = "area" | "district" | "store";
export type HierarchySectionKey = "detail" | "dp1" | "dp2" | "dp6" | "delivery" | "sos";

/** Un grupo PLANO tal como lo devuelve GET /api/hierarchy (backend/src/hierarchy.ts: HierarchyGroup).
 * El backend NO anida: agrupa exactamente al `level` pedido. Para reconstruir el árbol completo
 * División > Área > Distrito > Tienda, el cliente siempre pide level="store" (el más fino) y agrupa
 * localmente por los campos division/area/district/store presentes en cada fila. */
export interface HierarchyGroup {
  division: string;
  area: string;
  district?: string;
  store?: string;
  metrics: Record<string, KpiResult>;
}

/** Nodo del árbol ya reconstruido en el cliente para HierarchyTable. */
export interface HierarchyNode {
  id: string;
  level: "division" | "area" | "district" | "store";
  label: string;
  children?: HierarchyNode[];
  metrics: Record<string, KpiResult>;
}

export interface AuthUser {
  username: string;
}
