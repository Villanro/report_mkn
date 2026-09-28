import type { BscResponse, KpiCatalogRow } from "@/types";
import { colorClasses } from "@/lib/color";
import { formatCount, formatMoney, formatPercent, formatSeconds } from "@/lib/format";

const SECTION_LABELS: Record<KpiCatalogRow["section"], string> = {
  operations: "OPERATIONS SCORECARD",
  smg: "SMG — CUSTOMER FEEDBACK",
  raw_material: "RAW MATERIAL COST",
};

const SECTION_ORDER: KpiCatalogRow["section"][] = ["operations", "smg", "raw_material"];

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

/**
 * Tabla de KPIs por día (una fila por KPI, una columna por día), usada tanto en la
 * pantalla BSC principal como en el Detalle de Tienda (spec: pantalla 6 = BSC principal
 * filtrado a una tienda). `data.validation` marca por día si Net Sales del BSC no
 * coincide con la suma de los datos filtrados -> "VERIFICAR SELECTOR".
 */
export function BscTable({ data }: { data: BscResponse }) {
  const anyMismatch = Object.values(data.validation).some(Boolean);

  return (
    <div className="space-y-6">
      {anyMismatch && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
          VERIFICAR SELECTOR
        </div>
      )}

      {SECTION_ORDER.map((section) => {
        const rows = data.kpis.filter((k) => k.section === section);
        if (rows.length === 0) return null;
        return (
          <div key={section}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
              {SECTION_LABELS[section]}
            </h2>
            <div className="overflow-auto rounded border border-gray-200 print:overflow-visible">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-[2] bg-gray-100">
                  <tr>
                    <th className="sticky left-0 z-[3] min-w-[220px] bg-gray-100 px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">
                      KPI
                    </th>
                    {data.days.map((d) => (
                      <th
                        key={d.bsc_fecha}
                        className={`whitespace-nowrap px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600 ${
                          data.validation[d.bsc_fecha] ? "bg-red-100" : ""
                        }`}
                      >
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b border-gray-100">
                      <td className="sticky left-0 z-[1] bg-white px-3 py-1.5 font-medium text-gray-700">
                        {row.label}
                      </td>
                      {data.days.map((d) => {
                        const cell = row.byDay[d.bsc_fecha];
                        return (
                          <td
                            key={d.bsc_fecha}
                            className={`whitespace-nowrap px-3 py-1.5 text-right ${colorClasses(
                              cell?.color
                            )}`}
                          >
                            <div>{formatValueCell(row.key, cell?.value)}</div>
                            {cell?.pct !== undefined && (
                              <div className="text-xs opacity-80">
                                {formatPctCell(row.key, cell.pct)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
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
