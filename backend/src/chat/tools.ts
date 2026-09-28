import { getRows } from "../ords/cache.js";
import { aggregateRows } from "../aggregate.js";
import { applyFilters, FILTER_FIELD_MAP, FILTER_KEYS, parseFilters, type BscFilters } from "../query/filters.js";
import { getAvailableDays, resolveWeekDays } from "../date/week.js";
import { KPI_CATALOG, type KpiCatalogEntry } from "../kpiCatalog.js";
import { buildHierarchy, groupRowsByLevel, type HierarchyLevel, type HierarchySection } from "../hierarchy.js";
import type { Color } from "../config/colorThresholds.js";
import { getKpiDirection } from "../config/kpiDirection.js";
import type { KpiResult } from "../kpis.js";
import type { OrdsRow } from "../types/ordsRow.js";
import type { KimiToolDef } from "./kimiClient.js";

/**
 * Tools expuestas al modelo. Cada una es un envoltorio delgado sobre la MISMA lógica que ya
 * usan `routes/bsc.ts` y `routes/hierarchy.ts` (getRows/applyFilters/aggregateRows/KPI_CATALOG/
 * buildHierarchy) — nunca filas crudas de ORDS ni una fuente de datos distinta a la que ve un
 * usuario navegando la app. Ver la "Regla de oro" en .claude/agents/chat.md.
 */

const FILTERS_SCHEMA = {
  type: "object",
  description: "Filtros opcionales tipo segmentación (OR dentro de cada categoría, AND entre categorías).",
  properties: Object.fromEntries(
    FILTER_KEYS.map((key) => [
      key,
      { type: "array", items: { type: "string" }, description: `Valores de ${FILTER_FIELD_MAP[key]}` },
    ]),
  ),
};

export const TOOL_DEFS: KimiToolDef[] = [
  {
    type: "function",
    function: {
      name: "list_days",
      description:
        "Lista todos los días (bsc_fecha) disponibles en los datos, con su semana fiscal y etiqueta, ordenados de más antiguo a más reciente.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_kpis",
      description:
        "Lista el catálogo de KPIs disponibles en el BSC principal (key, label, section) para saber qué `keys` pedir en get_bsc.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_filter_options",
      description:
        "Valores únicos disponibles para cada filtro (company, division, area, district, store, building, region, careStatus), en cascada según los filtros ya seleccionados. Úsala para encontrar el nombre exacto de una tienda/distrito/área antes de usarlo en otro tool.",
      parameters: {
        type: "object",
        properties: { filters: FILTERS_SCHEMA },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_bsc",
      description:
        "Devuelve los KPIs del BSC principal (una fila por KPI, una columna por día) para la semana fiscal que contiene `day` (o la más reciente si no se da `day`), agregando las filas que cumplan `filters`. Usa `keys` para pedir solo algunos KPIs (recomendado, ver list_kpis) y no saturar la respuesta.",
      parameters: {
        type: "object",
        properties: {
          day: { type: "string", description: "bsc_fecha o tie_bsc_descripcion de cualquier día de la semana deseada. Si se omite, usa la semana más reciente." },
          keys: { type: "array", items: { type: "string" }, description: "Subconjunto de `key`s del catálogo (ver list_kpis). Si se omite, devuelve todos." },
          filters: FILTERS_SCHEMA,
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_hierarchy",
      description:
        "Desglosa un `day` puntual por area/district/store (o por daypart 1/2/6, delivery o SOS) con sus métricas agregadas y color. Útil para preguntas de '¿qué tienda/distrito tuvo el peor/mejor X?'.",
      parameters: {
        type: "object",
        properties: {
          day: { type: "string", description: "bsc_fecha exacto del día a desglosar (usa list_days o get_bsc para obtenerlo)." },
          level: { type: "string", enum: ["area", "district", "store"] },
          section: { type: "string", enum: ["detail", "dp1", "dp2", "dp6", "delivery", "sos"] },
          filters: FILTERS_SCHEMA,
        },
          required: ["day", "level", "section"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rank_stores",
      description:
        "Ordena area/district/store por un KPI del catálogo (ver list_kpis) y devuelve el ranking ya calculado — úsala SIEMPRE que la pregunta sea del tipo '¿qué tienda/distrito/área tuvo el peor/mejor X?' en vez de pedir get_hierarchy y comparar a mano vos mismo, es más rápido y evita errores de cálculo. " +
        "'worst'/'best' ya tiene en cuenta si un valor alto es bueno o malo para ese KPI específico (ventas: más alto es mejor; costos/mermas/horas de más: más bajo es mejor; KPIs con color: sigue la regla de color rojo=peor). Fijate en el campo `ranking_rule` de la respuesta para confirmar qué criterio se usó. " +
        "Con `days` (varios bsc_fecha, ej. los 7 de una semana vía list_days), agrega esos días juntos ANTES de calcular el KPI (misma lógica de suma/promedio que usa el resto de la app) — es la forma correcta de responder '¿qué tienda tuvo el peor X en LA SEMANA?' en una sola llamada, en vez de pedir un día a la vez y promediar a mano.",
      parameters: {
        type: "object",
        properties: {
          kpi_key: { type: "string", description: "Clave del catálogo (ver list_kpis), ej. 'service_time'." },
          level: { type: "string", enum: ["area", "district", "store"], description: "Default: 'store'." },
          day: { type: "string", description: "Un único bsc_fecha. Omitir si se usa `days`." },
          days: {
            type: "array",
            items: { type: "string" },
            description: "Varios bsc_fecha a agregar juntos (ej. la semana completa). Si se omite y tampoco se da `day`, usa la semana fiscal más reciente completa.",
          },
          direction: { type: "string", enum: ["best", "worst"] },
          limit: { type: "number", description: "Default: 10." },
          filters: FILTERS_SCHEMA,
        },
        required: ["kpi_key", "direction"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_trend",
      description:
        "Serie de un KPI a lo largo de varios días para UNA entidad puntual (area/district/store) — úsala en vez de pedir get_hierarchy día por día y armar la serie vos mismo cuando la pregunta sea sobre la evolución/tendencia de algo a lo largo del tiempo.",
      parameters: {
        type: "object",
        properties: {
          kpi_key: { type: "string", description: "Clave del catálogo (ver list_kpis)." },
          level: { type: "string", enum: ["area", "district", "store"] },
          name: {
            type: "string",
            description: "Nombre exacto del area/district/store (usa list_filter_options para confirmarlo).",
          },
          days: {
            type: "array",
            items: { type: "string" },
            description: "bsc_fecha a incluir en la serie. Si se omite, usa los 7 días de la semana fiscal más reciente.",
          },
        },
        required: ["kpi_key", "level", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_alerts",
      description:
        "Escanea KPIs en rojo/amarillo y devuelve directamente cuáles/dónde, sin que tengas que revisar todo a mano — úsala para preguntas tipo '¿qué está en rojo hoy?' o '¿hay algo en amarillo esta semana?'. Cubre tanto los KPIs del BSC principal (a nivel compañía, con los `filters` aplicados) como las métricas con color que existen por tienda (DP1/DP2/DP6 labor+SOS+OSAT/ZOD/Problem Resolution, y SOS general) — exactamente los mismos datos con color que ya se ven navegando la app, nada más.",
      parameters: {
        type: "object",
        properties: {
          color: { type: "string", enum: ["red", "yellow"] },
          day: { type: "string", description: "Un único bsc_fecha. Si se omite y tampoco se da `days`, usa el día más reciente disponible." },
          days: { type: "array", items: { type: "string" }, description: "Varios bsc_fecha a escanear." },
          section: {
            type: "string",
            enum: ["operations", "smg", "raw_material"],
            description: "Limita el escaneo a nivel compañía a esta sección del catálogo (ver list_kpis). No afecta el escaneo por tienda.",
          },
          filters: FILTERS_SCHEMA,
          limit: { type: "number", description: "Default: 20 resultados." },
        },
        required: ["color"],
      },
    },
  },
];

function coerceFilters(input: unknown): BscFilters {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const query: Record<string, unknown> = {};
  for (const key of FILTER_KEYS) {
    if (raw[key] !== undefined) query[key] = raw[key];
  }
  return parseFilters(query);
}

async function listDays() {
  const rows = await getRows();
  return getAvailableDays(rows);
}

function listKpis() {
  return KPI_CATALOG.map((entry) => ({ key: entry.key, label: entry.label, section: entry.section }));
}

async function listFilterOptions(args: { filters?: unknown }) {
  const rows = await getRows();
  const selected = coerceFilters(args.filters);
  const result: Record<string, string[]> = {};
  for (const key of FILTER_KEYS) {
    const field = FILTER_FIELD_MAP[key];
    const scoped = applyFilters(rows, selected, key);
    const values = new Set<string>();
    for (const row of scoped) {
      const value = row[field];
      if (typeof value === "string" && value.length > 0) values.add(value);
    }
    result[key] = [...values].sort((a, b) => a.localeCompare(b));
  }
  return result;
}

async function getBsc(args: { day?: unknown; keys?: unknown; filters?: unknown }) {
  const rows = await getRows();
  const filters = coerceFilters(args.filters);
  const dayParam = typeof args.day === "string" ? args.day : undefined;
  const weekDays = resolveWeekDays(rows, dayParam);

  const requestedKeys = Array.isArray(args.keys) ? new Set(args.keys.filter((k) => typeof k === "string")) : undefined;
  const catalog = requestedKeys ? KPI_CATALOG.filter((entry) => requestedKeys.has(entry.key)) : KPI_CATALOG;

  const aggregatedByDay: Record<string, ReturnType<typeof aggregateRows>> = {};
  for (const day of weekDays) {
    const dayRows = rows.filter((row) => row.bsc_fecha === day.bsc_fecha);
    aggregatedByDay[day.bsc_fecha] = aggregateRows(applyFilters(dayRows, filters));
  }

  const kpis = catalog.map((entry) => ({
    key: entry.key,
    label: entry.label,
    section: entry.section,
    byDay: Object.fromEntries(weekDays.map((day) => [day.bsc_fecha, entry.compute(aggregatedByDay[day.bsc_fecha])])),
  }));

  return { days: weekDays, kpis };
}

async function getHierarchy(args: { day?: unknown; level?: unknown; section?: unknown; filters?: unknown }) {
  const { day, level, section } = args;
  if (typeof day !== "string") throw new Error("day es requerido (bsc_fecha)");
  const validLevels: HierarchyLevel[] = ["area", "district", "store"];
  const validSections: HierarchySection[] = ["detail", "dp1", "dp2", "dp6", "delivery", "sos"];
  if (typeof level !== "string" || !validLevels.includes(level as HierarchyLevel)) {
    throw new Error(`level debe ser uno de: ${validLevels.join(", ")}`);
  }
  if (typeof section !== "string" || !validSections.includes(section as HierarchySection)) {
    throw new Error(`section debe ser uno de: ${validSections.join(", ")}`);
  }

  const rows = await getRows();
  const filters = coerceFilters(args.filters);
  const dayRows = applyFilters(
    rows.filter((row) => row.bsc_fecha === day),
    filters,
  );
  return buildHierarchy(dayRows, level as HierarchyLevel, section as HierarchySection);
}

/**
 * Mapea cada `key` del catálogo (kpiCatalog.ts) al nombre de la función que realmente lo calcula
 * en kpis.ts — necesario porque KPI_CATALOG envuelve algunas funciones en closures (ej. los
 * `dp{n}_sales` de 1-6 todos llaman a `dpSales`), así que la key del catálogo no siempre es igual
 * al nombre de la función. `kpiDirection.ts` (de "kpis") indexa por nombre de función, no por key
 * de catálogo, de ahí la necesidad de este mapeo. Auditado 1:1 contra kpiCatalog.ts — mantenerlo
 * en sync si se agrega un KPI nuevo al catálogo.
 */
const CATALOG_KEY_TO_FUNCTION: Record<string, string> = {
  gross_sales: "grossSales",
  net_sales: "netSales",
  dp1_sales: "dpSales",
  dp2_sales: "dpSales",
  dp3_sales: "dpSales",
  dp4_sales: "dpSales",
  dp5_sales: "dpSales",
  dp6_sales: "dpSales",
  puw_sales: "puwSales",
  delivery_sales: "deliverySales",
  upsize_pct: "upsizePct",
  kiosk_total_sales: "kioskTotalSales",
  kiosk_sales: "kioskSales",
  to_go_sales: "toGoSales",
  mobile_total_sales: "mobileTotalSales",
  mobile_in_sales: "mobileInSales",
  mobile_to_go_sales: "mobileToGoSales",
  mobile_puw_sales: "mobilePuwSales",
  handheld_sales: "handheldSales",
  avg_sales_by_store: "avgSalesByStore",
  sales_vs_last_week: "salesVsLastWeek",
  sales_vs_last_year: "salesVsLastYear",
  sales_vs_2_year_ago: "salesVs2YearAgo",
  sales_wtd: "salesWTD",
  sales_wtd_last_year: "salesWTDLastYear",
  sales_ptd: "salesPTD",
  sales_ptd_last_year: "salesPTDLastYear",
  sales_ytd: "salesYTD",
  sales_ytd_last_year: "salesYTDLastYear",
  coupons: "coupons",
  discounts: "discounts",
  employee_meals: "employeeMeals",
  manager_meals: "managerMeals",
  transactions: "transactions",
  avg_trans_by_store: "avgTransByStore",
  trans_vs_last_year: "transVsLastYear",
  kiosk_transactions: "kioskTransactions",
  kiosk_in_trans: "kioskInTrans",
  kiosk_to_go_trans: "kioskToGoTrans",
  mobile_transactions: "mobileTransactions",
  mobile_in_trans: "mobileInTrans",
  mobile_to_go_trans: "mobileToGoTrans",
  mobile_puw_trans: "mobilePuwTrans",
  handheld_transactions: "handheldTransactions",
  ticket_average: "ticketAverage",
  ticket_average_last_year: "ticketAverageLastYear",
  labor_hr_guide: "laborHrGuide",
  dp1_labor_vs_guide: "dpLaborVsGuide",
  dp2_labor_vs_guide: "dpLaborVsGuide",
  dp3_labor_vs_guide: "dpLaborVsGuide",
  dp4_labor_vs_guide: "dpLaborVsGuide",
  dp5_labor_vs_guide: "dpLaborVsGuide",
  dp6_labor_vs_guide: "dpLaborVsGuide",
  avg_labor_hr_guide: "avgLaborHrGuide",
  labor_pct_target_vs_actual: "laborPctTargetVsActual",
  labor_crew_pct: "laborCrewPct",
  labor_ssv_pct: "laborSsvPct",
  labor_manager_pct: "laborManagerPct",
  wtd_overtime_hr_pct: "wtdOvertimeHrPct",
  service_time: "serviceTime",
  dp1_sos: "dpServiceTime",
  dp2_sos: "dpServiceTime",
  dp3_sos: "dpServiceTime",
  dp4_sos: "dpServiceTime",
  dp5_sos: "dpServiceTime",
  dp6_sos: "dpServiceTime",
  car_count: "carCount",
  dp1_car_count: "dpCarCount",
  dp2_car_count: "dpCarCount",
  dp3_car_count: "dpCarCount",
  dp4_car_count: "dpCarCount",
  dp5_car_count: "dpCarCount",
  dp6_car_count: "dpCarCount",
  spmh_target_vs_actual: "spmhTargetVsActual",
  tpmh: "tpmh",
  cash_plus_minus: "cashPlusMinus",
  refunds: "refunds",
  voids: "voids",
  meal_replacement_qty: "mealReplacementQty",
  meal_replacement_amount: "mealReplacementAmount",
  osat: "osat",
  zod: "zod",
  problem_resolution: "problemResolution",
  food_actual: "foodActual",
  food_ideal_var: "foodIdealVar",
  paper_actual: "paperActual",
  paper_ideal_var: "paperIdealVar",
  food_paper_actual: "foodPaperActual",
  food_paper_var: "foodPaperVar",
  waste: "waste",
};

const VALID_LEVELS: HierarchyLevel[] = ["area", "district", "store"];

function findKpiEntry(kpiKey: unknown): KpiCatalogEntry {
  if (typeof kpiKey !== "string") throw new Error("kpi_key es requerido (ver list_kpis)");
  const entry = KPI_CATALOG.find((e) => e.key === kpiKey);
  if (!entry) throw new Error(`kpi_key desconocido: "${kpiKey}". Usa list_kpis para ver las claves válidas.`);
  return entry;
}

function resolveDays(rows: OrdsRow[], args: { day?: unknown; days?: unknown }): string[] {
  if (Array.isArray(args.days) && args.days.length > 0) {
    return args.days.filter((d): d is string => typeof d === "string");
  }
  if (typeof args.day === "string") return [args.day];
  return resolveWeekDays(rows).map((d) => d.bsc_fecha);
}

const SEVERITY: Record<Color, number> = { red: 3, yellow: 2, green: 1 };

function magnitudeOf(result: KpiResult): number {
  return result.pct ?? result.value ?? 0;
}

interface RankedEntity {
  division: string;
  area: string;
  district?: string;
  store?: string;
  value: number | undefined;
  pct: number | undefined;
  color: Color | undefined;
}

async function rankStores(args: {
  kpi_key?: unknown;
  level?: unknown;
  day?: unknown;
  days?: unknown;
  direction?: unknown;
  limit?: unknown;
  filters?: unknown;
}) {
  const entry = findKpiEntry(args.kpi_key);
  const level: HierarchyLevel = VALID_LEVELS.includes(args.level as HierarchyLevel)
    ? (args.level as HierarchyLevel)
    : "store";
  const direction = args.direction === "best" ? "best" : "worst";
  const limit = typeof args.limit === "number" && args.limit > 0 ? Math.floor(args.limit) : 10;

  const rows = await getRows();
  const filters = coerceFilters(args.filters);
  const days = resolveDays(rows, args);

  const scoped = applyFilters(
    rows.filter((row) => days.includes(row.bsc_fecha)),
    filters,
  );

  const groups = groupRowsByLevel(scoped, level);
  const ranked: RankedEntity[] = groups.map((group) => {
    const result = entry.compute(aggregateRows(group.rows));
    return {
      division: group.division,
      area: group.area,
      district: group.district,
      store: group.store,
      value: result.value,
      pct: result.pct,
      color: result.color,
    };
  });

  const hasColor = ranked.some((r) => r.color !== undefined);
  const functionName = CATALOG_KEY_TO_FUNCTION[entry.key];
  const kpiDirection = hasColor ? undefined : getKpiDirection(functionName);
  // "worst" para un KPI lowerIsBetter (ej. Waste, Labor Crew %) significa "valor más alto primero"
  // — lo opuesto del fallback numérico puro (que asume ascendente=peor). Sin esta inversión,
  // rank_stores diría que la tienda con MENOS desperdicio tiene "el peor Waste", literalmente al
  // revés (ver aviso de "kpis" — tabla en config/kpiDirection.ts, no inventada acá).
  const invert = kpiDirection === "lowerIsBetter";

  ranked.sort((a, b) => {
    if (hasColor) {
      const sa = a.color ? SEVERITY[a.color] : 0;
      const sb = b.color ? SEVERITY[b.color] : 0;
      if (sa !== sb) return direction === "worst" ? sb - sa : sa - sb;
    }
    const ma = magnitudeOf(a);
    const mb = magnitudeOf(b);
    const ascendingIsWorst = !invert;
    const worstFirst = ascendingIsWorst ? ma - mb : mb - ma;
    return direction === "worst" ? worstFirst : -worstFirst;
  });

  let rankingRule: string;
  if (hasColor) {
    rankingRule = "Este KPI tiene regla de color (rojo/amarillo/verde) — 'worst'/'best' sigue esa regla, igual que en la app.";
  } else if (kpiDirection === "lowerIsBetter") {
    rankingRule = "Este KPI es 'lowerIsBetter' (un valor más alto es peor, ej. costo/merma/horas de más) — 'worst' devuelve el valor más alto primero.";
  } else if (kpiDirection === "higherIsBetter") {
    rankingRule = "Este KPI es 'higherIsBetter' (un valor más alto es mejor, ej. ventas/transacciones) — 'worst' devuelve el valor más bajo primero.";
  } else {
    rankingRule =
      "Este KPI no tiene regla de color ni dirección catalogada — 'worst' devuelve el valor numérico más bajo primero como fallback, pero esto podría no reflejar el criterio de negocio real para este KPI en particular. Verificá con cautela.";
  }

  return {
    kpi_key: entry.key,
    kpi_label: entry.label,
    level,
    days,
    direction,
    ranking_rule: rankingRule,
    items: ranked.slice(0, limit),
  };
}

/**
 * Resuelve `needle` (lo que haya escrito/recordado el modelo, ej. "Prince Charles") al valor
 * EXACTO de `field` en los datos (ej. "12163 - Prince Charles (A01-D201)") por coincidencia de
 * substring case-insensitive, y explota con un error claro si no matchea nada o si es ambiguo —
 * nunca deja pasar en silencio un nombre que no matchea ninguna fila (eso produciría una serie
 * "vacía" indistinguible de datos reales en 0, ver incidente real: el modelo pasó "Prince
 * Charles" sin el código/distrito y sin este chequeo la tool devolvía 0 en todos los días como
 * si fuera un dato real).
 */
function resolveExactLabel(rows: OrdsRow[], field: keyof OrdsRow, needle: string): string {
  const needleLower = needle.toLowerCase();
  const candidates = new Set<string>();
  for (const row of rows) {
    const value = row[field];
    if (typeof value === "string" && value.toLowerCase().includes(needleLower)) candidates.add(value);
  }
  if (candidates.size === 0) {
    throw new Error(`No se encontró ningún "${field}" que contenga "${needle}". Usa list_filter_options para ver los valores exactos.`);
  }
  if (candidates.size > 1) {
    throw new Error(`"${needle}" es ambiguo, coincide con varios: ${[...candidates].join(" | ")}. Especificá el nombre completo (usa list_filter_options).`);
  }
  return [...candidates][0];
}

async function getTrend(args: { kpi_key?: unknown; level?: unknown; name?: unknown; days?: unknown }) {
  const entry = findKpiEntry(args.kpi_key);
  if (!VALID_LEVELS.includes(args.level as HierarchyLevel)) {
    throw new Error(`level debe ser uno de: ${VALID_LEVELS.join(", ")}`);
  }
  const level = args.level as HierarchyLevel;
  if (typeof args.name !== "string" || args.name.length === 0) {
    throw new Error("name es requerido (usa list_filter_options para ver los valores exactos)");
  }

  const rows = await getRows();
  const days = resolveDays(rows, args);
  const field: keyof OrdsRow = level === "area" ? "area" : level === "district" ? "district" : "store";
  const exactName = resolveExactLabel(rows, field, args.name);
  const matching = rows.filter((row) => row[field] === exactName);

  const series = days.map((day) => {
    const dayRows = matching.filter((row) => row.bsc_fecha === day);
    const result = entry.compute(aggregateRows(dayRows));
    return { day, value: result.value, pct: result.pct, color: result.color };
  });

  return { kpi_key: entry.key, kpi_label: entry.label, level, name: exactName, series };
}

const ALERT_HIERARCHY_SECTIONS: HierarchySection[] = ["dp1", "dp2", "dp6", "sos"];

async function findAlerts(args: {
  color?: unknown;
  day?: unknown;
  days?: unknown;
  section?: unknown;
  filters?: unknown;
  limit?: unknown;
}) {
  if (args.color !== "red" && args.color !== "yellow") throw new Error("color debe ser 'red' o 'yellow'");
  const color = args.color;
  const limit = typeof args.limit === "number" && args.limit > 0 ? Math.floor(args.limit) : 20;
  const sectionFilter = typeof args.section === "string" ? args.section : undefined;

  const rows = await getRows();
  const filters = coerceFilters(args.filters);
  let days: string[];
  if (Array.isArray(args.days) && args.days.length > 0) {
    days = args.days.filter((d): d is string => typeof d === "string");
  } else if (typeof args.day === "string") {
    days = [args.day];
  } else {
    const available = getAvailableDays(rows);
    days = available.length > 0 ? [available[available.length - 1].bsc_fecha] : [];
  }

  const items: Record<string, unknown>[] = [];

  for (const day of days) {
    const dayRows = applyFilters(
      rows.filter((row) => row.bsc_fecha === day),
      filters,
    );

    const aggregated = aggregateRows(dayRows);
    for (const entry of KPI_CATALOG) {
      if (sectionFilter && entry.section !== sectionFilter) continue;
      const result = entry.compute(aggregated);
      if (result.color === color) {
        items.push({ scope: "company", day, kpi: entry.key, label: entry.label, value: result.value, pct: result.pct, color: result.color });
        if (items.length >= limit) return { items, truncated: true };
      }
    }

    for (const section of ALERT_HIERARCHY_SECTIONS) {
      const groups = buildHierarchy(dayRows, "store", section);
      for (const group of groups) {
        for (const [metricKey, metric] of Object.entries(group.metrics)) {
          if (metric.color === color) {
            items.push({
              scope: "store",
              day,
              section,
              store: group.store,
              district: group.district,
              area: group.area,
              metric: metricKey,
              value: metric.value,
              pct: metric.pct,
              color: metric.color,
            });
            if (items.length >= limit) return { items, truncated: true };
          }
        }
      }
    }
  }

  return { items, truncated: false };
}

export async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_days":
      return listDays();
    case "list_kpis":
      return listKpis();
    case "list_filter_options":
      return listFilterOptions(args);
    case "get_bsc":
      return getBsc(args);
    case "get_hierarchy":
      return getHierarchy(args);
    case "rank_stores":
      return rankStores(args);
    case "get_trend":
      return getTrend(args);
    case "find_alerts":
      return findAlerts(args);
    default:
      throw new Error(`Tool desconocida: ${name}`);
  }
}
