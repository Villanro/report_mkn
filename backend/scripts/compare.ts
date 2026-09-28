/**
 * Script de validación de LÓGICA (no de integración real con ORDS).
 *
 * docs/spec-bsc.md § "Validación" pide un script que, para un día y una agrupación/tienda,
 * imprima todos los KPIs para compararlos con el Excel original. Hoy no tenemos acceso a
 * ORDS_URL ni credenciales (decisión ya tomada por el usuario), así que este script NO llama
 * a `fetchAllRows` de ORDS: construye un FIXTURE SINTÉTICO de `OrdsRow` (dos "tiendas" de
 * prueba) diseñado para que, al agregarse con `aggregateRows`, el total del día 2026-09-26
 * para la agrupación "A01 - AETOS Bahamas" coincida EXACTAMENTE con los 7 valores de
 * referencia del Excel citados en la spec.
 *
 * Esto valida que el pipeline (aggregate.ts + kpis.ts) calcula correctamente una vez que
 * entran los datos correctos — NO valida que ORDS realmente devuelva esos números. Cuando
 * haya credenciales reales, este script debería reemplazar el fixture por `fetchAllRows`
 * filtrado por día/tienda.
 *
 * Uso: npx tsx backend/scripts/compare.ts [--day=2026-09-26] [--area="A01 - AETOS Bahamas"]
 */
import type { OrdsRow } from "../src/types/ordsRow.js";
import { aggregateRows } from "../src/aggregate.js";
import { KPI_CATALOG } from "../src/kpiCatalog.js";

const DAY = "2026-09-26";
const AREA = "A01 - AETOS Bahamas";

/**
 * Referencia del Excel (docs/spec-bsc.md § Validación), día 2026-09-26, total AREA.
 * DP6 no está en la spec como referencia: se deja en el fixture pero no se verifica aquí.
 */
const REFERENCE: Record<string, number> = {
  gross_sales: 99352.82,
  net_sales: 79569.51,
  dp1_sales: 4556.84,
  dp2_sales: 20273.68,
  dp3_sales: 15332.29,
  dp4_sales: 22398.85,
  dp5_sales: 12453.09,
};

function makeRow(overrides: Record<string, number | string>): OrdsRow {
  const dims = {
    tie_bsc_descripcion: `26P09W4 - ${DAY}`,
    bsc_fecha: DAY,
    bsc_company: "Popeyes",
    division: "D1",
    area: AREA,
    district: "D201",
    store: "15144 - Mackey Street (A01-D201)",
    building: "",
    region: "",
    tie_care_status: "",
  };
  return { ...dims, ...overrides } as unknown as OrdsRow;
}

/**
 * Dos tiendas ficticias cuya SUMA reproduce los 7 valores de referencia del Excel.
 * Además incluye campos de PROMEDIO (syr_service_time, hr_labor_dp1, hr_guide_dp1) con
 * valores distintos entre tiendas, para poder verificar en el resumen que se promedian
 * (no se suman) y que "Breakfast Labor $" sí usa la SUMA cruda de hr_labor_dp1.
 */
const FIXTURE_ROWS: OrdsRow[] = [
  makeRow({
    store: "15144 - Mackey Street (A01-D201)",
    uno: 1,
    syr_gross_sales: 59352.82,
    infs_vta_actual: 47569.51,
    syr_sal_dp1: 2556.84,
    syr_sal_dp2: 10273.68,
    syr_sal_dp3: 7332.29,
    syr_sal_dp4: 12398.85,
    syr_sal_dp5: 6453.09,
    syr_sal_dp6: 3000,
    syr_trans: 3000,
    syr_crew_hr: 200,
    syr_mngr_hr: 40,
    syr_guid_hr: 230,
    syr_labor: 11000,
    syr_service_time: 190, // promedio con la otra tienda -> 195
    hr_labor_dp1: 30, // promedio -> 25, pero SUM(hr_labor_dp1) = 50 (usado en Breakfast Labor $)
    hr_guide_dp1: 28,
  }),
  makeRow({
    store: "20211 - Bay Street (A01-D202)",
    district: "D202",
    uno: 1,
    syr_gross_sales: 40000.0,
    infs_vta_actual: 32000.0,
    syr_sal_dp1: 2000.0,
    syr_sal_dp2: 10000.0,
    syr_sal_dp3: 8000.0,
    syr_sal_dp4: 10000.0,
    syr_sal_dp5: 6000.0,
    syr_sal_dp6: 2000,
    syr_trans: 2000,
    syr_crew_hr: 160,
    syr_mngr_hr: 30,
    syr_guid_hr: 180,
    syr_labor: 8000,
    syr_service_time: 200, // promedio con la otra tienda -> 195
    hr_labor_dp1: 20, // promedio -> 25, pero SUM(hr_labor_dp1) = 50
    hr_guide_dp1: 22,
  }),
];

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? "true"];
    }),
  );
  return { day: args.day ?? DAY, area: args.area ?? AREA };
}

function fmt(n: number | undefined): string {
  if (n === undefined) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number | undefined): string {
  if (n === undefined) return "";
  return `${(n * 100).toFixed(1)}%`;
}

function main() {
  const { day, area } = parseArgs();
  if (day !== DAY || area !== AREA) {
    console.error(
      `Este fixture sintético solo cubre day=${DAY} area="${AREA}". Pediste day=${day} area="${area}".`,
    );
    process.exit(1);
  }

  const rows = FIXTURE_ROWS.filter((r) => r.bsc_fecha === day && r.area === area);
  const aggregated = aggregateRows(rows);

  console.log(`# Comparación de KPIs — día ${day}, agrupación "${area}" (FIXTURE SINTÉTICO, no ORDS real)\n`);
  console.log("nombre".padEnd(32), "valor".padStart(14), "%".padStart(10), "color".padStart(8));
  console.log("-".repeat(66));
  for (const entry of KPI_CATALOG) {
    const result = entry.compute(aggregated);
    console.log(
      entry.label.padEnd(32),
      fmt(result.value).padStart(14),
      fmtPct(result.pct).padStart(10),
      (result.color ?? "").padStart(8),
    );
  }

  console.log("\n# Verificación contra referencia del Excel (docs/spec-bsc.md § Validación)\n");
  const byKey = Object.fromEntries(KPI_CATALOG.map((e) => [e.key, e]));
  const TOLERANCE = 0.02;
  let allOk = true;
  for (const [key, expected] of Object.entries(REFERENCE)) {
    const entry = byKey[key];
    const actual = entry.compute(aggregated).value ?? NaN;
    const diff = Math.abs(actual - expected);
    const ok = diff <= TOLERANCE;
    allOk &&= ok;
    console.log(
      `${ok ? "OK  " : "FAIL"} ${entry.label.padEnd(14)} esperado=${fmt(expected)} obtenido=${fmt(actual)} diff=${diff.toFixed(4)}`,
    );
  }

  console.log(
    `\nPromedios (no suma) — Service Time: ${fmt(aggregated.syr_service_time)} (esperado 195.00) | ` +
      `hr_labor_dp1 promedio: ${fmt(aggregated.hr_labor_dp1)} (esperado 25.00) | ` +
      `hr_labor_dp1 SUM cruda: ${fmt(aggregated.hr_labor_dp1_sum)} (esperado 50.00, usada en Breakfast Labor $)`,
  );

  console.log(allOk ? "\nTodos los valores de referencia coinciden." : "\nHay discrepancias, ver arriba.");
  process.exit(allOk ? 0 : 1);
}

main();
