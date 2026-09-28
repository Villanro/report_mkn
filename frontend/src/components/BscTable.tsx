import { Fragment } from "react";
import type { BscResponse, KpiCatalogRow, KpiColor } from "@/types";
import { cellClasses, dotClasses } from "@/lib/color";
import { formatCount, formatMoney, formatPercent, formatSeconds } from "@/lib/format";

const SECTION_LABELS: Record<KpiCatalogRow["section"], string> = {
  operations: "OPERATIONS SCORECARD",
  smg: "SMG — CUSTOMER FEEDBACK",
  raw_material: "RAW MATERIAL COST",
};

const SECTION_ORDER: KpiCatalogRow["section"][] = ["operations", "smg", "raw_material"];

/**
 * Sub-agrupación puramente visual (no cambia datos ni cálculos) para que la sección
 * OPERATIONS SCORECARD (~55 filas) se pueda escanear por tema en vez de como una sola
 * lista plana. El orden y las claves siguen backend/src/kpiCatalog.ts. Toda fila cuya
 * key no aparezca aquí cae en "Otros" (red de seguridad si el catálogo cambia).
 */
const OPERATIONS_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Sales",
    keys: [
      "gross_sales", "net_sales", "dp1_sales", "dp2_sales", "dp3_sales", "dp4_sales",
      "dp5_sales", "dp6_sales", "puw_sales", "delivery_sales", "upsize_pct",
      "kiosk_total_sales", "kiosk_sales", "to_go_sales", "mobile_total_sales",
      "mobile_in_sales", "mobile_to_go_sales", "mobile_puw_sales", "handheld_sales",
      "avg_sales_by_store",
    ],
  },
  {
    title: "Sales Trends",
    keys: [
      "sales_vs_last_week", "sales_vs_last_year", "sales_vs_2_year_ago", "sales_wtd",
      "sales_wtd_last_year", "sales_ptd", "sales_ptd_last_year", "sales_ytd",
      "sales_ytd_last_year",
    ],
  },
  {
    title: "Deductions",
    keys: ["coupons", "discounts", "employee_meals", "manager_meals"],
  },
  {
    title: "Transactions",
    keys: [
      "transactions", "avg_trans_by_store", "trans_vs_last_year", "kiosk_transactions",
      "kiosk_in_trans", "kiosk_to_go_trans", "mobile_transactions", "mobile_in_trans",
      "mobile_to_go_trans", "mobile_puw_trans", "handheld_transactions", "ticket_average",
      "ticket_average_last_year",
    ],
  },
  {
    title: "Labor",
    keys: [
      "labor_hr_guide", "dp1_labor_vs_guide", "dp2_labor_vs_guide", "dp3_labor_vs_guide",
      "dp4_labor_vs_guide", "dp5_labor_vs_guide", "dp6_labor_vs_guide", "avg_labor_hr_guide",
      "labor_pct_target_vs_actual", "labor_crew_pct", "labor_ssv_pct", "labor_manager_pct",
      "wtd_overtime_hr_pct",
    ],
  },
  {
    title: "Service & Speed",
    keys: [
      "service_time", "dp1_sos", "dp2_sos", "dp3_sos", "dp4_sos", "dp5_sos", "dp6_sos",
      "car_count", "dp1_car_count", "dp2_car_count", "dp3_car_count", "dp4_car_count",
      "dp5_car_count", "dp6_car_count", "spmh_target_vs_actual", "tpmh",
    ],
  },
  {
    title: "Cash & Variance",
    keys: [
      "cash_plus_minus", "refunds", "voids", "meal_replacement_qty",
      "meal_replacement_amount",
    ],
  },
];

const COLOR_PRIORITY: Record<Exclude<KpiColor, null>, number> = {
  red: 3,
  yellow: 2,
  green: 1,
};

/** Peor color de la fila entre los 7 días, para el indicador junto al KPI en la columna fija. */
function worstColor(byDay: Record<string, { color?: KpiColor } | undefined>): KpiColor | undefined {
  let worst: KpiColor | undefined;
  for (const cell of Object.values(byDay)) {
    const color = cell?.color;
    if (!color) continue;
    if (!worst || COLOR_PRIORITY[color] > COLOR_PRIORITY[worst]) worst = color;
  }
  return worst;
}

/**
 * El `value`/`pct` de KpiResult (backend/src/kpis.ts) no siempre son $/%: según el KPI son
 * segundos (SOS), conteos/horas sin símbolo, o un par "Target vs Actual" donde ambos lados
 * son la MISMA unidad (ambos % en Labor, ambos $/hora en SPMH). Estas listas vienen de
 * backend/src/kpiCatalog.ts (KPI_CATALOG) leyendo qué unidad usa cada `compute`.
 */
const SECONDS_KEYS = new Set([
  "service_time",
  "dp1_sos",
  "dp2_sos",
  "dp3_sos",
  "dp4_sos",
  "dp5_sos",
  "dp6_sos",
]);

const COUNT_KEYS = new Set([
  "transactions",
  "avg_trans_by_store",
  "trans_vs_last_year",
  "kiosk_transactions",
  "kiosk_in_trans",
  "kiosk_to_go_trans",
  "mobile_transactions",
  "mobile_in_trans",
  "mobile_to_go_trans",
  "mobile_puw_trans",
  "handheld_transactions",
  "car_count",
  "dp1_car_count",
  "dp2_car_count",
  "dp3_car_count",
  "dp4_car_count",
  "dp5_car_count",
  "dp6_car_count",
  "tpmh",
  "meal_replacement_qty",
  "labor_hr_guide",
  "dp1_labor_vs_guide",
  "dp2_labor_vs_guide",
  "dp3_labor_vs_guide",
  "dp4_labor_vs_guide",
  "dp5_labor_vs_guide",
  "dp6_labor_vs_guide",
  "avg_labor_hr_guide",
]);

/** Target y Actual son ambos fracción de % (no un $ y un %). */
const PERCENT_PAIR_KEYS = new Set(["labor_pct_target_vs_actual"]);
/** Target y Actual son ambos $/hora (no un $ y un %) — evita el bug de "actual" mostrando 5000%. */
const MONEY_PAIR_KEYS = new Set(["spmh_target_vs_actual"]);

function formatValueCell(rowKey: string, value: number | undefined) {
  if (value === undefined) return "";
  if (SECONDS_KEYS.has(rowKey)) return formatSeconds(value);
  if (COUNT_KEYS.has(rowKey)) return formatCount(value);
  if (PERCENT_PAIR_KEYS.has(rowKey)) return formatPercent(value);
  return formatMoney(value);
}

function formatPctCell(rowKey: string, pct: number | undefined) {
  if (pct === undefined) return "";
  if (MONEY_PAIR_KEYS.has(rowKey)) return formatMoney(pct);
  return formatPercent(pct);
}

/** Agrupa las filas de una sección por tema (solo operations tiene sub-grupos; ver OPERATIONS_GROUPS). */
function groupSectionRows(
  section: KpiCatalogRow["section"],
  rows: BscResponse["kpis"]
): { title?: string; rows: BscResponse["kpis"] }[] {
  if (section !== "operations") return [{ rows }];
  const used = new Set<string>();
  const groups = OPERATIONS_GROUPS.map(({ title, keys }) => {
    const groupRows = keys
      .map((k) => rows.find((r) => r.key === k))
      .filter((r): r is BscResponse["kpis"][number] => Boolean(r));
    groupRows.forEach((r) => used.add(r.key));
    return { title, rows: groupRows };
  }).filter((g) => g.rows.length > 0);
  const leftover = rows.filter((r) => !used.has(r.key));
  if (leftover.length > 0) groups.push({ title: "Otros", rows: leftover });
  return groups;
}

function ColorLegend() {
  const items: { color: Exclude<KpiColor, null>; label: string }[] = [
    { color: "green", label: "En objetivo" },
    { color: "yellow", label: "Atención" },
    { color: "red", label: "Acción requerida" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 print:hidden">
      {items.map(({ color, label }) => (
        <span key={color} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClasses(color)}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

/**
 * Tabla de KPIs por día (una fila por KPI, una columna por día), usada tanto en la
 * pantalla BSC principal como en el Detalle de Tienda (spec: pantalla 6 = BSC principal
 * filtrado a una tienda). `data.validation` marca por día si Net Sales del BSC no
 * coincide con la suma de los datos filtrados -> "VERIFICAR SELECTOR".
 */
export function BscTable({ data }: { data: BscResponse }) {
  const anyMismatch = Object.values(data.validation).some(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ColorLegend />
        {anyMismatch && (
          <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            VERIFICAR SELECTOR
          </div>
        )}
      </div>

      {SECTION_ORDER.map((section) => {
        const rows = data.kpis.filter((k) => k.section === section);
        if (rows.length === 0) return null;
        const groups = groupSectionRows(section, rows);
        let rowIndex = 0;
        return (
          <div key={section}>
            <h2 className="mb-2 border-b-2 border-gray-800 pb-1 text-sm font-bold uppercase tracking-wide text-gray-800">
              {SECTION_LABELS[section]}
            </h2>
            <div className="max-h-[75vh] overflow-auto rounded-lg border border-gray-200 shadow-sm print:max-h-none print:overflow-visible print:shadow-none">
              <table className="w-full border-separate border-spacing-0 text-sm tabular-nums">
                <thead className="sticky top-0 z-[2]">
                  <tr>
                    <th className="sticky left-0 z-[3] min-w-[240px] border-b border-gray-300 bg-gray-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      KPI
                    </th>
                    {data.days.map((d) => (
                      <th
                        key={d.bsc_fecha}
                        className={`whitespace-nowrap border-b border-gray-300 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 ${
                          data.validation[d.bsc_fecha] ? "bg-red-100" : "bg-gray-100"
                        }`}
                      >
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <Fragment key={group.title ?? `${section}-flat`}>
                      {group.title && (
                        <tr key={`${section}-group-${group.title}`} className="bg-slate-100/80">
                          <td
                            colSpan={data.days.length + 1}
                            className="sticky left-0 border-y border-slate-200 bg-slate-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {group.title}
                          </td>
                        </tr>
                      )}
                      {group.rows.map((row) => {
                        const striped = rowIndex % 2 === 1;
                        rowIndex += 1;
                        const rowBg = striped ? "bg-slate-50" : "bg-white";
                        const status = worstColor(row.byDay);
                        return (
                          <tr key={row.key} className={`border-b border-gray-100 ${rowBg}`}>
                            <td
                              className={`sticky left-0 z-[1] px-3 py-1.5 font-medium text-gray-700 ${rowBg}`}
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 shrink-0 rounded-full ${
                                    status ? dotClasses(status) : "bg-transparent"
                                  }`}
                                  aria-hidden
                                />
                                {row.label}
                              </span>
                            </td>
                            {data.days.map((d) => {
                              const cell = row.byDay[d.bsc_fecha];
                              return (
                                <td
                                  key={d.bsc_fecha}
                                  className={`whitespace-nowrap px-3 py-1.5 text-right ${cellClasses(
                                    cell?.color
                                  )}`}
                                >
                                  <div className="font-semibold">
                                    {formatValueCell(row.key, cell?.value)}
                                  </div>
                                  {cell?.pct !== undefined && (
                                    <div className="text-xs font-normal opacity-75">
                                      {formatPctCell(row.key, cell.pct)}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
