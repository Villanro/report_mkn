import { describe, expect, it } from "vitest";
import { aggregateRows } from "./aggregate.js";
import type { OrdsRow } from "./types/ordsRow.js";

function makeRow(overrides: Partial<OrdsRow>): OrdsRow {
  const base: Record<string, number | string> = {
    tie_bsc_descripcion: "26P09W4 - 09/26/2026",
    bsc_fecha: "2026-09-26",
    bsc_company: "A01",
    division: "D1",
    area: "AR1",
    district: "DT1",
    store: "S1",
    building: "B1",
    region: "R1",
    tie_care_status: "OK",
    uno: 1,
    infs_vta_actual: 0,
    syr_gross_sales: 0,
    syr_service_time: 0,
    syr_sos_dp1: 0,
    syr_sos_dp2: 0,
    hr_labor_dp1: 0,
    hr_guide_dp1: 0,
    syr_upsize_pct: 0,
  };
  return { ...base, ...overrides } as unknown as OrdsRow;
}

describe("aggregateRows", () => {
  it("suma los campos normales (por ejemplo, Net Sales)", () => {
    const rows = [
      makeRow({ infs_vta_actual: 100, uno: 1 }),
      makeRow({ infs_vta_actual: 250, uno: 1 }),
    ];
    const result = aggregateRows(rows);
    expect(result.infs_vta_actual).toBe(350);
    expect(result.uno).toBe(2);
  });

  it("promedia los campos de la lista de excepciones (service time, sos, hr_labor/hr_guide dpN, upsize)", () => {
    const rows = [
      makeRow({ syr_service_time: 180, syr_sos_dp1: 100, hr_labor_dp1: 4, hr_guide_dp1: 5, syr_upsize_pct: 0.1 }),
      makeRow({ syr_service_time: 220, syr_sos_dp1: 200, hr_labor_dp1: 6, hr_guide_dp1: 7, syr_upsize_pct: 0.2 }),
    ];
    const result = aggregateRows(rows);
    expect(result.syr_service_time).toBe(200);
    expect(result.syr_sos_dp1).toBe(150);
    expect(result.hr_labor_dp1).toBe(5);
    expect(result.hr_guide_dp1).toBe(6);
    expect(result.syr_upsize_pct).toBeCloseTo(0.15);
  });

  it("expone la SUMA cruda (sufijo _sum) de los campos que se agregan por promedio", () => {
    const rows = [makeRow({ hr_labor_dp1: 4 }), makeRow({ hr_labor_dp1: 6 })];
    const result = aggregateRows(rows);
    expect(result.hr_labor_dp1).toBe(5);
    expect(result.hr_labor_dp1_sum).toBe(10);
  });

  it("caso especial Breakfast Labor $: usa SUM(hr_labor_dp1), no el promedio agregado por defecto", () => {
    const rows = [makeRow({ hr_labor_dp1: 3, syr_labor: 100, syr_crew_hr: 10 }), makeRow({ hr_labor_dp1: 7, syr_labor: 200, syr_crew_hr: 20 })];
    const result = aggregateRows(rows);
    // hr_labor_dp1 (promedio, usado por otros KPIs) != hr_labor_dp1_sum (usado por Breakfast Labor $)
    expect(result.hr_labor_dp1).toBe(5);
    expect(result.hr_labor_dp1_sum).toBe(10);
    expect(result.syr_labor).toBe(300);
    expect(result.syr_crew_hr).toBe(30);
  });

  it("filas vacías produce agregado vacío", () => {
    expect(aggregateRows([])).toEqual({});
  });

  it("trata null/no-numérico como 0 al sumar", () => {
    const rows = [
      makeRow({ infs_vta_actual: 100 }),
      { ...makeRow({}), infs_vta_actual: undefined } as unknown as OrdsRow,
    ];
    const result = aggregateRows(rows);
    expect(result.infs_vta_actual).toBe(100);
  });
});
