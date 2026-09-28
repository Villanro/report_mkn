import type { OrdsRow } from "../types/ordsRow.js";

/**
 * Datos sintéticos de desarrollo, activados con `ORDS_MODE=mock` (ver client.ts). Sirven
 * para que "frontend" pueda ver las 8 pantallas con tablas realmente pobladas (valores, %,
 * jerarquías, y los 3 colores) mientras no haya credenciales reales de ORDS_URL.
 *
 * NO es el fixture de precisión de scripts/compare.ts (ese reproduce exactamente los totales
 * de referencia del Excel para un solo día/área). Este generador prioriza variedad: varias
 * divisiones/áreas/distritos/tiendas, 7 días de una misma semana fiscal, y perfiles de
 * desempeño rotados por tienda para que cada KPI coloreable muestre verde, amarillo y rojo
 * en distintas filas de la jerarquía.
 *
 * Determinístico (mismo seed siempre) para que las capturas/comparaciones entre corridas
 * sean estables.
 */

interface StoreMeta {
  division: string;
  area: string;
  district: string;
  store: string;
  building: string;
  region: string;
  careStatus: string;
}

const COMPANY = "A01- AETOS Bahamas";

const DIVISIONS = ["Division 1", "Division 2"];
const AREAS_BY_DIVISION: Record<string, string[]> = {
  "Division 1": ["Area 1A", "Area 1B"],
  "Division 2": ["Area 2A", "Area 2B"],
};
const DISTRICTS_PER_AREA = 2;
const STORES_PER_DISTRICT = 3;

const WEEK_CODE = "26P09W4";
const WEEK_DATES = [
  "09/20/2026",
  "09/21/2026",
  "09/22/2026",
  "09/23/2026",
  "09/24/2026",
  "09/25/2026",
  "09/26/2026",
];
// Domingo bajo, ramp hasta sábado alto (patrón típico de QSR).
const DAY_SALES_CURVE = [0.85, 0.92, 0.92, 0.95, 1.05, 1.25, 1.35];

function buildStoreMetas(): StoreMeta[] {
  const metas: StoreMeta[] = [];
  let storeSeq = 15000;
  for (const division of DIVISIONS) {
    for (const area of AREAS_BY_DIVISION[division]) {
      for (let d = 1; d <= DISTRICTS_PER_AREA; d++) {
        const district = `${area.replace("Area ", "D")}-${d}`;
        for (let s = 1; s <= STORES_PER_DISTRICT; s++) {
          storeSeq += 1;
          metas.push({
            division,
            area,
            district,
            store: `${storeSeq} - Store ${storeSeq} (${district})`,
            building: storeSeq % 2 === 0 ? "B1" : "B2",
            region: division === "Division 1" ? "North" : "South",
            careStatus: storeSeq % 5 === 0 ? "Watch" : "Active",
          });
        }
      }
    }
  }
  return metas;
}

const STORE_METAS = buildStoreMetas();

/** PRNG determinístico (mulberry32) para ruido reproducible por (storeIndex, dayIndex, salt). */
function noise(storeIndex: number, dayIndex: number, salt: number): number {
  let a = (storeIndex * 9301 + dayIndex * 49297 + salt * 233280) % 233280;
  a = (a * 9301 + 49297) % 233280;
  return a / 233280; // [0, 1)
}

/** Perfil rotado 0/1/2 por tienda, desfasado por `offset`, para decorrelar qué tienda cae en cada color. */
function profile(storeIndex: number, offset: number): 0 | 1 | 2 {
  return ((storeIndex + offset) % 3) as 0 | 1 | 2;
}

function pick3<T>(p: 0 | 1 | 2, green: T, yellow: T, red: T): T {
  return p === 0 ? green : p === 1 ? yellow : red;
}

const DP_SALES_FRACTION = { 1: 0.06, 2: 0.24, 3: 0.2, 4: 0.27, 5: 0.17, 6: 0.06 } as const;

function buildRow(storeIndex: number, meta: StoreMeta, dayIndex: number): OrdsRow {
  const n = (salt: number) => noise(storeIndex, dayIndex, salt);

  const storeScale = 2600 + (storeIndex % 8) * 380;
  const netSales = Math.round(storeScale * DAY_SALES_CURVE[dayIndex] * (0.9 + n(1) * 0.2) * 100) / 100;
  const grossSales = Math.round(netSales * 1.24 * 100) / 100;

  const avgTicket = 8 + (storeIndex % 4) * 0.5;
  const trans = Math.round(netSales / avgTicket);

  // --- Comparativos de ventas (perfiles rotados para variar verde/amarillo/rojo) ---
  const lwGrowth = pick3(profile(storeIndex, 0), 0.05, -0.015, -0.045); // salesVsLastWeekPct
  const netSalesLw = Math.round((netSales / (1 + lwGrowth)) * 100) / 100;

  const lyGrowth = pick3(profile(storeIndex, 1), 0.04, -0.01, -0.035); // salesVsLastYearPct
  const netSalesLy = Math.round(netSales * 0.9 * 100) / 100;
  const netSalesCmpLy = Math.round((netSalesLy * (1 + lyGrowth)) * 100) / 100;

  const netSalesLy2 = Math.round(netSales * 0.82 * 100) / 100;
  const netSalesCmpLy2 = Math.round(netSalesLy2 * (1 + lyGrowth * 0.8) * 100) / 100;

  const transGrowth = pick3(profile(storeIndex, 2), 0.03, -0.005, -0.02); // transVsLastYearPct
  const transLy = Math.round(trans * 0.95);
  const transCmpLy = Math.round(transLy * (1 + transGrowth));

  // --- Labor ---
  const laborPctActual = pick3(profile(storeIndex, 0), 0.205, 0.26, 0.31); // laborPct
  const syrLabor = Math.round(netSales * laborPctActual * 100) / 100;
  const crewHr = Math.round(((netSales / 55) * 0.85 + n(2) * 3) * 10) / 10;
  const mngrHr = Math.round(crewHr * 0.2 * 10) / 10;

  const guideGap = pick3(profile(storeIndex, 1), 0.02, 0.045, 0.08); // avgLaborHrGuidePct
  const guidHr = Math.round((crewHr + mngrHr) / (1 + guideGap) * 10) / 10;

  const wtdOvtPct = 0.03 + n(3) * 0.05;
  const syr4Hr = Math.round((crewHr + mngrHr) * 4 * 10) / 10;
  const syr4OvtHr = Math.round(syr4Hr * wtdOvtPct * 10) / 10;

  // --- SOS (perfil propio por sección, desfasado) ---
  const serviceTime = pick3(profile(storeIndex, 2), 180, 210, 235); // sosDaySeconds
  const sosDp1 = pick3(profile(storeIndex, 0), 140, 160, 180); // sosDp1Dp2Seconds
  const sosDp2 = pick3(profile(storeIndex, 1), 140, 160, 180);
  const sosDp3 = pick3(profile(storeIndex, 2), 160, 180, 200); // sosDp3Dp4Seconds
  const sosDp4 = pick3(profile(storeIndex, 0), 160, 180, 200);
  const sosDp5 = pick3(profile(storeIndex, 1), 190, 210, 230); // sosDp5Seconds
  const sosDp6 = pick3(profile(storeIndex, 2), 240, 260, 280); // sosDp6Seconds

  // --- Cash / voids / refunds / meals / cupones / descuentos ---
  const cashPct = pick3(profile(storeIndex, 0), 0.0002, 0.0007, 0.0015); // cashPct
  const cashSign = storeIndex % 2 === 0 ? 1 : -1;
  const refundsPct = pick3(profile(storeIndex, 1), 0.0015, 0.0035, 0.007); // refundsPct
  const voidsPct = pick3(profile(storeIndex, 2), 0.003, 0.007, 0.012); // managerVoidsPct
  const couponsPct = pick3(profile(storeIndex, 0), 0.012, 0.025, 0.04); // couponsPct
  const discountsPct = pick3(profile(storeIndex, 1), 0.012, 0.025, 0.04); // discountsPct
  const emplMealPct = pick3(profile(storeIndex, 2), 0.003, 0.006, 0.009); // emplManagerMealsPct
  const mngrMealPct = pick3(profile(storeIndex, 0), 0.003, 0.006, 0.009);

  // --- SMG ---
  const osatPct = pick3(profile(storeIndex, 1), 0.88, 0.72, 0.55); // osatPct
  const zodPct = pick3(profile(storeIndex, 2), 0.03, 0.07, 0.15); // zodPct
  const prPct = pick3(profile(storeIndex, 0), 0.55, 0.3, 0.1); // problemResolutionPct
  const smgCount = 40 + (storeIndex % 6) * 5;
  const smgProblemCount = 8 + (storeIndex % 5);

  function smgFor(dpOffset: number, countScale: number) {
    const osat = pick3(profile(storeIndex, dpOffset + 1), 0.88, 0.72, 0.55);
    const zod = pick3(profile(storeIndex, dpOffset + 2), 0.03, 0.07, 0.15);
    const pr = pick3(profile(storeIndex, dpOffset), 0.55, 0.3, 0.1);
    const count = Math.round(smgCount * countScale);
    const problemCount = Math.max(1, Math.round(smgProblemCount * countScale));
    return {
      count,
      overall: Math.round(count * osat),
      defzone: Math.round(count * zod),
      problemCount,
      problemsol: Math.round(problemCount * pr),
    };
  }

  const smgDp1 = smgFor(0, 0.3);
  const smgDp2 = smgFor(1, 0.35);
  const smgDp4 = smgFor(2, 0.15);
  const smgDp6 = smgFor(0, 0.1);

  // --- Car count ---
  const carCountTotal = Math.round(trans * 0.4);
  const carCountByDp = Object.fromEntries(
    (Object.entries(DP_SALES_FRACTION) as [string, number][]).map(([dp, frac]) => [
      dp,
      Math.round(carCountTotal * frac * 1.1),
    ]),
  ) as Record<string, number>;

  // --- Raw material cost ---
  const foodPct = 0.29 + n(4) * 0.03;
  const foodIdealPct = foodPct - (0.01 + n(5) * 0.02 - 0.01);
  const paperPct = 0.03 + n(6) * 0.005;
  const paperIdealPct = paperPct - (0.002 + n(7) * 0.004 - 0.002);
  const wastePct = 0.008 + n(8) * 0.01;

  const dims = {
    tie_bsc_descripcion: `${WEEK_CODE} - ${WEEK_DATES[dayIndex]}`,
    bsc_fecha: `2026-09-${(20 + dayIndex).toString().padStart(2, "0")}`,
    bsc_company: COMPANY,
    division: meta.division,
    area: meta.area,
    district: meta.district,
    store: meta.store,
    building: meta.building,
    region: meta.region,
    tie_care_status: meta.careStatus,
  };

  const row: Record<string, number | string> = {
    ...dims,
    uno: 1,

    syr_gross_sales: grossSales,
    infs_vta_actual: netSales,
    syr_sal_dp1: Math.round(netSales * DP_SALES_FRACTION[1] * 100) / 100,
    syr_sal_dp2: Math.round(netSales * DP_SALES_FRACTION[2] * 100) / 100,
    syr_sal_dp3: Math.round(netSales * DP_SALES_FRACTION[3] * 100) / 100,
    syr_sal_dp4: Math.round(netSales * DP_SALES_FRACTION[4] * 100) / 100,
    syr_sal_dp5: Math.round(netSales * DP_SALES_FRACTION[5] * 100) / 100,
    syr_sal_dp6: Math.round(netSales * DP_SALES_FRACTION[6] * 100) / 100,
    syr_sal_puw: Math.round(netSales * 0.03 * 100) / 100,
    syr_delivery: Math.round(netSales * 0.08 * 100) / 100,
    syr_upsize_pct: 0.1 + n(9) * 0.15,
    syr_sal_llevar: Math.round(netSales * 0.15 * 100) / 100,

    kiosk_in_sales: Math.round(netSales * 0.05 * 100) / 100,
    kiosk_out_sales: Math.round(netSales * 0.02 * 100) / 100,
    kiosk_sales_ref: Math.round(netSales * 0.1 * 100) / 100,
    kiosk_in_trans: Math.round(trans * 0.05),
    kiosk_out_trans: Math.round(trans * 0.02),
    kiosk_trans_ref: Math.round(trans * 0.1),

    mobile_in_sales: Math.round(netSales * 0.04 * 100) / 100,
    mobile_out_sales: Math.round(netSales * 0.03 * 100) / 100,
    mobile_puw_sales: Math.round(netSales * 0.01 * 100) / 100,
    mobile_sales_ref: Math.round(netSales * 0.1 * 100) / 100,
    mobile_in_trans: Math.round(trans * 0.04),
    mobile_out_trans: Math.round(trans * 0.03),
    mobile_puw_trans: Math.round(trans * 0.01),
    mobile_trans_ref: Math.round(trans * 0.1),

    syr_handheld_sales: Math.round(netSales * 0.06 * 100) / 100,
    syr_handheld_sales_ref: Math.round(netSales * 0.12 * 100) / 100,
    syr_handheld_trans: Math.round(trans * 0.06),
    syr_handheld_trans_ref: Math.round(trans * 0.12),

    syr_net_sales_lw: netSalesLw,
    syr_net_sales_cmp_ly: netSalesCmpLy,
    syr_net_sales_ly: netSalesLy,
    syr_net_sales_cmp_ly2: netSalesCmpLy2,
    syr_net_sales_ly2: netSalesLy2,

    syr4_gross_sales: Math.round(grossSales * (dayIndex + 1) * 100) / 100,
    syr4_gross_sal_ly: Math.round(grossSales * (dayIndex + 1) * 0.93 * 100) / 100,
    syr4_gross_sales_cmp: Math.round(grossSales * (dayIndex + 1) * 1.02 * 100) / 100,
    syr3_gross_sales: Math.round(grossSales * 15 * 100) / 100,
    syr3_gross_sal_ly: Math.round(grossSales * 15 * 0.94 * 100) / 100,
    syr3_gross_sales_cmp: Math.round(grossSales * 15 * 1.01 * 100) / 100,
    syr5_gross_sales: Math.round(grossSales * 180 * 100) / 100,
    syr5_gross_sal_ly: Math.round(grossSales * 180 * 0.95 * 100) / 100,

    syr_coupons: Math.round(netSales * couponsPct * 100) / 100,
    syr_discounts: Math.round(netSales * discountsPct * 100) / 100,
    syr_empl_meal: Math.round(netSales * emplMealPct * 100) / 100,
    syr_mngr_meal: Math.round(netSales * mngrMealPct * 100) / 100,

    syr_trans: trans,
    syr_trans_cmp_ly: transCmpLy,
    syr_trans_ly: transLy,
    syr_trans_hr: Math.round(trans * (0.95 + n(10) * 0.1)),

    syr_crew_hr: crewHr,
    syr_mngr_hr: mngrHr,
    syr_guid_hr: guidHr,
    syr_labor: syrLabor,
    syr_crew_labor: Math.round(syrLabor * 0.7 * 100) / 100,
    syr_ssv_labor: Math.round(syrLabor * 0.1 * 100) / 100,
    syr_mngr_labor: Math.round(syrLabor * 0.2 * 100) / 100,
    syr_labor_sales_ref: netSales,
    syr4_ovt_hr: syr4OvtHr,
    syr4_hr: syr4Hr,

    syr_service_time: serviceTime,
    syr_sos_dp1: sosDp1,
    syr_sos_dp2: sosDp2,
    syr_sos_dp3: sosDp3,
    syr_sos_dp4: sosDp4,
    syr_sos_dp5: sosDp5,
    syr_sos_dp6: sosDp6,

    car_count_dp1: carCountByDp["1"],
    car_count_dp2: carCountByDp["2"],
    car_count_dp3: carCountByDp["3"],
    car_count_dp4: carCountByDp["4"],
    car_count_dp5: carCountByDp["5"],
    car_count_dp6: carCountByDp["6"],
    car_count_dp1_lw: Math.round(carCountByDp["1"] * (0.95 + n(11) * 0.1)),
    car_count_dp2_lw: Math.round(carCountByDp["2"] * (0.95 + n(12) * 0.1)),
    car_count_dp3_lw: Math.round(carCountByDp["3"] * (0.95 + n(13) * 0.1)),
    car_count_dp4_lw: Math.round(carCountByDp["4"] * (0.95 + n(14) * 0.1)),
    car_count_dp5_lw: Math.round(carCountByDp["5"] * (0.95 + n(15) * 0.1)),
    car_count_dp6_lw: Math.round(carCountByDp["6"] * (0.95 + n(16) * 0.1)),

    syr_cash_mm: Math.round(netSales * cashPct * cashSign * 100) / 100,
    syr_mngr_void_amt: Math.round(grossSales * refundsPct * 100) / 100,
    syr_reg_void_amt: Math.round(netSales * voidsPct * 100) / 100,
    syr_meal_replacement_qty: (storeIndex + dayIndex) % 4,
    syr_meal_replacement_amt: Math.round(((storeIndex + dayIndex) % 4) * 5.25 * 100) / 100,

    hr_labor_dp1: Math.round(crewHr * DP_SALES_FRACTION[1] * 10) / 10,
    hr_labor_dp2: Math.round(crewHr * DP_SALES_FRACTION[2] * 10) / 10,
    hr_labor_dp3: Math.round(crewHr * DP_SALES_FRACTION[3] * 10) / 10,
    hr_labor_dp4: Math.round(crewHr * DP_SALES_FRACTION[4] * 10) / 10,
    hr_labor_dp5: Math.round(crewHr * DP_SALES_FRACTION[5] * 10) / 10,
    hr_labor_dp6: Math.round(crewHr * DP_SALES_FRACTION[6] * 10) / 10,
    hr_guide_dp1: Math.round(guidHr * DP_SALES_FRACTION[1] * 10) / 10,
    hr_guide_dp2: Math.round(guidHr * DP_SALES_FRACTION[2] * 10) / 10,
    hr_guide_dp3: Math.round(guidHr * DP_SALES_FRACTION[3] * 10) / 10,
    hr_guide_dp4: Math.round(guidHr * DP_SALES_FRACTION[4] * 10) / 10,
    hr_guide_dp5: Math.round(guidHr * DP_SALES_FRACTION[5] * 10) / 10,
    hr_guide_dp6: Math.round(guidHr * DP_SALES_FRACTION[6] * 10) / 10,

    syr_sal_dp1_lw: Math.round((netSales * DP_SALES_FRACTION[1]) / (1 + lwGrowth) * 100) / 100,
    syr_sal_dp2_lw: Math.round((netSales * DP_SALES_FRACTION[2]) / (1 + lwGrowth) * 100) / 100,
    syr_sal_dp6_lw: Math.round((netSales * DP_SALES_FRACTION[6]) / (1 + lwGrowth) * 100) / 100,
    syr_sal_dp1_cmp: Math.round(netSales * DP_SALES_FRACTION[1] * (1 + lyGrowth) * 100) / 100,
    syr_sal_dp1_ly: Math.round(netSales * DP_SALES_FRACTION[1] * 0.9 * 100) / 100,
    syr_sal_dp2_cmp: Math.round(netSales * DP_SALES_FRACTION[2] * (1 + lyGrowth) * 100) / 100,
    syr_sal_dp2_ly: Math.round(netSales * DP_SALES_FRACTION[2] * 0.9 * 100) / 100,
    syr_sal_dp6_cmp: Math.round(netSales * DP_SALES_FRACTION[6] * (1 + lyGrowth) * 100) / 100,
    syr_sal_dp6_ly: Math.round(netSales * DP_SALES_FRACTION[6] * 0.9 * 100) / 100,

    smg_overall: Math.round(smgCount * osatPct),
    smg_count: smgCount,
    smg_def_zone: Math.round(smgCount * zodPct),
    smg_problemsol: Math.round(smgProblemCount * prPct),
    smg_problemsol_count: smgProblemCount,

    smg_overall_dp1: smgDp1.overall,
    smg_count_dp1: smgDp1.count,
    smg_defzone_dp1: smgDp1.defzone,
    smg_problemsol_dp1: smgDp1.problemsol,
    smg_problemsol_count_dp1: smgDp1.problemCount,

    smg_overall_dp2: smgDp2.overall,
    smg_count_dp2: smgDp2.count,
    smg_defzone_dp2: smgDp2.defzone,
    smg_problemsol_dp2: smgDp2.problemsol,
    smg_problemsol_count_dp2: smgDp2.problemCount,

    smg_overall_dp4: smgDp4.overall,
    smg_count_dp4: smgDp4.count,
    smg_defzone_dp4: smgDp4.defzone,
    smg_problemsol_dp4: smgDp4.problemsol,
    smg_problemsol_count_dp4: smgDp4.problemCount,

    smg_overall_dp6: smgDp6.overall,
    smg_count_dp6: smgDp6.count,
    smg_defzone_dp6: smgDp6.defzone,
    smg_problemsol_dp6: smgDp6.problemsol,
    smg_problemsol_count_dp6: smgDp6.problemCount,

    syr_comida_costo_actual: Math.round(netSales * foodPct * 100) / 100,
    syr_comida_costo_teorico: Math.round(netSales * foodIdealPct * 100) / 100,
    syr_papel_costo_actual: Math.round(netSales * paperPct * 100) / 100,
    syr_papel_costo_teorico: Math.round(netSales * paperIdealPct * 100) / 100,
    syr_waste: Math.round(netSales * wastePct * 100) / 100,
  };

  return row as unknown as OrdsRow;
}

let cachedMockRows: OrdsRow[] | undefined;

/** Genera (una sola vez, memoizado) el dataset sintético completo: 24 tiendas x 7 días. */
export function generateMockRows(): OrdsRow[] {
  if (cachedMockRows) return cachedMockRows;

  const rows: OrdsRow[] = [];
  STORE_METAS.forEach((meta, storeIndex) => {
    for (let dayIndex = 0; dayIndex < WEEK_DATES.length; dayIndex++) {
      rows.push(buildRow(storeIndex, meta, dayIndex));
    }
  });

  cachedMockRows = rows;
  return rows;
}
