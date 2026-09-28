import { describe, expect, it } from "vitest";
import * as kpis from "./kpis.js";
import type { NumericRow } from "./kpis.js";

/** Fila con todos los campos en 0 salvo los que se sobreescriban explícitamente. */
function row(overrides: NumericRow = {}): NumericRow {
  return new Proxy(overrides, {
    get(target, prop: string | symbol) {
      if (typeof prop !== "string") return undefined;
      return prop in target ? target[prop] : 0;
    },
  }) as NumericRow;
}

describe("Operations Scorecard", () => {
  it("Gross Sales", () => {
    expect(kpis.grossSales(row({ syr_gross_sales: 99352.82 }))).toEqual({ value: 99352.82 });
  });

  it("Net Sales", () => {
    expect(kpis.netSales(row({ infs_vta_actual: 79569.51 }))).toEqual({ value: 79569.51 });
  });

  it("DP1..DP6 Sales: valor y % sobre Net Sales", () => {
    const r = row({ syr_sal_dp3: 15332.29, infs_vta_actual: 79569.51 });
    const result = kpis.dpSales(r, 3);
    expect(result.value).toBeCloseTo(15332.29);
    expect(result.pct).toBeCloseTo(15332.29 / 79569.51);
  });

  it("DP1..DP6 Sales: NS 0 -> % vacío", () => {
    const result = kpis.dpSales(row({ syr_sal_dp1: 100, infs_vta_actual: 0 }), 1);
    expect(result.pct).toBeUndefined();
  });

  it("PUW Sales", () => {
    const r = row({ syr_sal_puw: 500, infs_vta_actual: 1000 });
    expect(kpis.puwSales(r)).toEqual({ value: 500, pct: 0.5 });
  });

  it("Delivery Sales", () => {
    const r = row({ syr_delivery: 200, infs_vta_actual: 1000 });
    expect(kpis.deliverySales(r)).toEqual({ value: 200, pct: 0.2 });
  });

  it("Upsize %: no tiene valor propio, solo el % promediado", () => {
    expect(kpis.upsizePct(row({ syr_upsize_pct: 0.12 }))).toEqual({ value: undefined, pct: 0.12 });
  });

  it("Kiosk Total Sales", () => {
    const r = row({ kiosk_in_sales: 100, kiosk_out_sales: 50, kiosk_sales_ref: 300 });
    const result = kpis.kioskTotalSales(r);
    expect(result.value).toBe(150);
    expect(result.pct).toBeCloseTo(0.5);
  });

  it("Kiosk Sales", () => {
    const r = row({ kiosk_in_sales: 100, kiosk_sales_ref: 200 });
    expect(kpis.kioskSales(r)).toEqual({ value: 100, pct: 0.5 });
  });

  it("Kiosk Sales: ref 0 -> % vacío", () => {
    expect(kpis.kioskSales(row({ kiosk_in_sales: 100, kiosk_sales_ref: 0 })).pct).toBeUndefined();
  });

  it("TO GO Sales", () => {
    const r = row({ syr_sal_llevar: 300, infs_vta_actual: 1000 });
    expect(kpis.toGoSales(r)).toEqual({ value: 300, pct: 0.3 });
  });

  it("Mobile Total Sales", () => {
    const r = row({ mobile_in_sales: 10, mobile_out_sales: 20, mobile_puw_sales: 30, mobile_sales_ref: 120 });
    const result = kpis.mobileTotalSales(r);
    expect(result.value).toBe(60);
    expect(result.pct).toBeCloseTo(0.5);
  });

  it("Mobile IN / TO GO / PUW Sales", () => {
    const r = row({ mobile_in_sales: 10, mobile_out_sales: 20, mobile_puw_sales: 30, mobile_sales_ref: 100 });
    expect(kpis.mobileInSales(r)).toEqual({ value: 10, pct: 0.1 });
    expect(kpis.mobileToGoSales(r)).toEqual({ value: 20, pct: 0.2 });
    expect(kpis.mobilePuwSales(r)).toEqual({ value: 30, pct: 0.3 });
  });

  it("Handheld Sales", () => {
    const r = row({ syr_handheld_sales: 40, syr_handheld_sales_ref: 200 });
    expect(kpis.handheldSales(r)).toEqual({ value: 40, pct: 0.2 });
  });

  it("Average Sales by Store $", () => {
    expect(kpis.avgSalesByStore(row({ infs_vta_actual: 5000, uno: 2 }))).toEqual({ value: 2500 });
  });

  it("Average Sales by Store $: uno 0 -> vacío", () => {
    expect(kpis.avgSalesByStore(row({ infs_vta_actual: 5000, uno: 0 })).value).toBeUndefined();
  });

  it("Sales vs Last Week: valor y % con color", () => {
    const r = row({ infs_vta_actual: 1100, syr_net_sales_lw: 1000 });
    const result = kpis.salesVsLastWeek(r);
    expect(result.value).toBe(100);
    expect(result.pct).toBeCloseTo(0.1);
    expect(result.color).toBe("green");
  });

  it("Sales vs Last Week: lw 0 -> % vacío", () => {
    const result = kpis.salesVsLastWeek(row({ infs_vta_actual: 100, syr_net_sales_lw: 0 }));
    expect(result.pct).toBeUndefined();
    expect(result.color).toBeUndefined();
  });

  it("Sales vs Last Year", () => {
    const r = row({ syr_net_sales_cmp_ly: 900, syr_net_sales_ly: 1000 });
    const result = kpis.salesVsLastYear(r);
    expect(result.value).toBe(-100);
    expect(result.pct).toBeCloseTo(-0.1);
    expect(result.color).toBe("red");
  });

  it("Sales vs 2 Year Ago", () => {
    const r = row({ syr_net_sales_cmp_ly2: 1200, syr_net_sales_ly2: 1000 });
    const result = kpis.salesVs2YearAgo(r);
    expect(result.value).toBe(200);
    expect(result.pct).toBeCloseTo(0.2);
  });

  it("Sales WTD", () => {
    expect(kpis.salesWTD(row({ syr4_gross_sales: 5000 }))).toEqual({ value: 5000 });
  });

  it("Sales WTD Last Year", () => {
    const r = row({ syr4_gross_sal_ly: 1000, syr4_gross_sales_cmp: 1100 });
    const result = kpis.salesWTDLastYear(r);
    expect(result.value).toBe(1000);
    expect(result.pct).toBeCloseTo(0.1);
  });

  it("Sales WTD Last Year: ly 0 -> % vacío", () => {
    expect(kpis.salesWTDLastYear(row({ syr4_gross_sal_ly: 0 })).pct).toBeUndefined();
  });

  it("Sales PTD / Sales PTD Last Year", () => {
    expect(kpis.salesPTD(row({ syr3_gross_sales: 3000 }))).toEqual({ value: 3000 });
    const r = row({ syr3_gross_sal_ly: 1000, syr3_gross_sales_cmp: 900 });
    const result = kpis.salesPTDLastYear(r);
    expect(result.value).toBe(1000);
    expect(result.pct).toBeCloseTo(-0.1);
  });

  it("Sales YTD / Sales YTD Last Year", () => {
    expect(kpis.salesYTD(row({ syr5_gross_sales: 9000 }))).toEqual({ value: 9000 });
    const r = row({ syr5_gross_sal_ly: 1000, syr5_gross_sales: 1200 });
    const result = kpis.salesYTDLastYear(r);
    expect(result.value).toBe(1000);
    expect(result.pct).toBeCloseTo(0.2);
  });

  it("Coupons $ con color", () => {
    const r = row({ syr_coupons: 25, infs_vta_actual: 1000 });
    const result = kpis.coupons(r);
    expect(result.value).toBe(25);
    expect(result.pct).toBeCloseTo(0.025);
    expect(result.color).toBe("yellow");
  });

  it("Discounts $ con color", () => {
    const r = row({ syr_discounts: 40, infs_vta_actual: 1000 });
    expect(kpis.discounts(r).color).toBe("red");
  });

  it("Employee Meals $ con color", () => {
    const r = row({ syr_empl_meal: 3, infs_vta_actual: 1000 });
    expect(kpis.employeeMeals(r).color).toBe("green");
  });

  it("Manager Meals $ con color", () => {
    const r = row({ syr_mngr_meal: 8, infs_vta_actual: 1000 });
    expect(kpis.managerMeals(r).color).toBe("red");
  });

  it("Transactions #", () => {
    expect(kpis.transactions(row({ syr_trans: 250 }))).toEqual({ value: 250 });
  });

  it("Avg. Trans. by Store #", () => {
    expect(kpis.avgTransByStore(row({ syr_trans: 500, uno: 2 }))).toEqual({ value: 250 });
  });

  it("Avg. Trans. by Store #: uno 0 -> vacío", () => {
    expect(kpis.avgTransByStore(row({ syr_trans: 500, uno: 0 })).value).toBeUndefined();
  });

  it("Trans vs Last Year # con color", () => {
    const r = row({ syr_trans_cmp_ly: 105, syr_trans_ly: 100 });
    const result = kpis.transVsLastYear(r);
    expect(result.value).toBe(5);
    expect(result.pct).toBeCloseTo(0.05);
    expect(result.color).toBe("green");
  });

  it("Kiosk Transactions #", () => {
    const r = row({ kiosk_in_trans: 5, kiosk_out_trans: 3, kiosk_trans_ref: 16 });
    const result = kpis.kioskTransactions(r);
    expect(result.value).toBe(8);
    expect(result.pct).toBeCloseTo(0.5);
  });

  it("Kiosk IN / TO GO Trans #", () => {
    const r = row({ kiosk_in_trans: 5, kiosk_out_trans: 3, kiosk_trans_ref: 10 });
    expect(kpis.kioskInTrans(r)).toEqual({ value: 5, pct: 0.5 });
    expect(kpis.kioskToGoTrans(r)).toEqual({ value: 3, pct: 0.3 });
  });

  it("Mobile Transactions # y sus componentes", () => {
    const r = row({ mobile_in_trans: 2, mobile_out_trans: 3, mobile_puw_trans: 5, mobile_trans_ref: 20 });
    expect(kpis.mobileTransactions(r).value).toBe(10);
    expect(kpis.mobileInTrans(r)).toEqual({ value: 2, pct: 0.1 });
    expect(kpis.mobileToGoTrans(r)).toEqual({ value: 3, pct: 0.15 });
    expect(kpis.mobilePuwTrans(r)).toEqual({ value: 5, pct: 0.25 });
  });

  it("Handheld Transactions #", () => {
    const r = row({ syr_handheld_trans: 12, syr_handheld_trans_ref: 60 });
    expect(kpis.handheldTransactions(r)).toEqual({ value: 12, pct: 0.2 });
  });

  it("Ticket Average $", () => {
    expect(kpis.ticketAverage(row({ infs_vta_actual: 1000, syr_trans: 50 }))).toEqual({ value: 20 });
  });

  it("Ticket Average $: trans 0 -> vacío", () => {
    expect(kpis.ticketAverage(row({ infs_vta_actual: 1000, syr_trans: 0 })).value).toBeUndefined();
  });

  it("Ticket Average Last Year $", () => {
    expect(kpis.ticketAverageLastYear(row({ syr_net_sales_ly: 900, syr_trans_ly: 45 }))).toEqual({ value: 20 });
  });

  it("Labor HR (+/- guide) con color", () => {
    const r = row({ syr_crew_hr: 100, syr_mngr_hr: 20, syr_guid_hr: 110 });
    const result = kpis.laborHrGuide(r);
    expect(result.value).toBe(10);
    expect(result.pct).toBeCloseTo(10 / 110);
    expect(result.color).toBe("red");
  });

  it("DP1..DP6 labor +/- guide", () => {
    const r = row({ hr_labor_dp3: 12, hr_guide_dp3: 10 });
    const result = kpis.dpLaborVsGuide(r, 3);
    expect(result.value).toBe(2);
    expect(result.pct).toBeCloseTo(0.2);
  });

  it("DP1..DP6 labor +/- guide: guide 0 -> % vacío", () => {
    expect(kpis.dpLaborVsGuide(row({ hr_labor_dp2: 5, hr_guide_dp2: 0 }), 2).pct).toBeUndefined();
  });

  it("Avg. Labor HR +/- Guide", () => {
    const r = row({ syr_crew_hr: 100, syr_mngr_hr: 20, syr_guid_hr: 110, uno: 2 });
    expect(kpis.avgLaborHrGuide(r)).toEqual({ value: 5 });
  });

  it("Labor % (Target vs Actual)", () => {
    const r = row({ infs_vta_actual: 5000, uno: 1, syr_labor: 1200 });
    const result = kpis.laborPctTargetVsActual(r);
    expect(result.value).toBeCloseTo(0.245); // Tabla A: avg sales 5000 -> 24.5%
    expect(result.pct).toBeCloseTo(0.24);
    expect(result.color).toBe("yellow");
  });

  it("Labor Crew % / SSV % / Manager %", () => {
    const r = row({ syr_crew_labor: 500, syr_ssv_labor: 200, syr_mngr_labor: 300, syr_labor_sales_ref: 5000 });
    expect(kpis.laborCrewPct(r).pct).toBeCloseTo(0.1);
    expect(kpis.laborSsvPct(r).pct).toBeCloseTo(0.04);
    expect(kpis.laborManagerPct(r).pct).toBeCloseTo(0.06);
  });

  it("Labor Crew %: ref 0 -> vacío", () => {
    expect(kpis.laborCrewPct(row({ syr_crew_labor: 500, syr_labor_sales_ref: 0 })).pct).toBeUndefined();
  });

  it("WTD Overtime Hr. %", () => {
    expect(kpis.wtdOvertimeHrPct(row({ syr4_ovt_hr: 10, syr4_hr: 200 })).pct).toBeCloseTo(0.05);
  });

  it("Service Time con color", () => {
    expect(kpis.serviceTime(row({ syr_service_time: 195 }))).toEqual({ value: 195, color: "green" });
    expect(kpis.serviceTime(row({ syr_service_time: 230 })).color).toBe("red");
  });

  it("DP1..DP6 SOS con color según su banda", () => {
    expect(kpis.dpServiceTime(row({ syr_sos_dp1: 140 }), 1).color).toBe("green");
    expect(kpis.dpServiceTime(row({ syr_sos_dp3: 180 }), 3).color).toBe("yellow");
    expect(kpis.dpServiceTime(row({ syr_sos_dp5: 230 }), 5).color).toBe("red");
    expect(kpis.dpServiceTime(row({ syr_sos_dp6: 260 }), 6).color).toBe("yellow");
  });

  it("Car Count = suma de car_count_dp1..dp6", () => {
    const r = row({ car_count_dp1: 1, car_count_dp2: 2, car_count_dp3: 3, car_count_dp4: 4, car_count_dp5: 5, car_count_dp6: 6 });
    expect(kpis.carCount(r)).toEqual({ value: 21 });
  });

  it("DP1..DP6 Car Count %: valor y % sobre Car Count total", () => {
    const r = row({ car_count_dp4: 10, car_count_dp1: 5, car_count_dp2: 5 });
    const result = kpis.dpCarCount(r, 4);
    expect(result.value).toBe(10);
    expect(result.pct).toBeCloseTo(10 / 20);
  });

  it("DP1..DP6 Car Count %: Car Count total 0 -> % vacío", () => {
    expect(kpis.dpCarCount(row({}), 1).pct).toBeUndefined();
  });

  it("SPMH $ (Target vs Actual)", () => {
    const r = row({ infs_vta_actual: 5000, uno: 1, syr_crew_hr: 60, syr_mngr_hr: 20 });
    const result = kpis.spmhTargetVsActual(r);
    expect(result.value).toBe(48); // Tabla B: avg sales 5000 -> 48
    expect(result.pct).toBeCloseTo(62.5);
  });

  it("TPMH #", () => {
    const r = row({ syr_trans_hr: 8, syr_crew_hr: 60, syr_mngr_hr: 20 });
    expect(kpis.tpmh(r).value).toBeCloseTo(0.1);
  });

  it("Cash +/- con color (usa ABS)", () => {
    const r = row({ syr_cash_mm: -0.3, infs_vta_actual: 1000 });
    const result = kpis.cashPlusMinus(r);
    expect(result.value).toBe(-0.3);
    expect(result.pct).toBeCloseTo(0.0003);
    expect(result.color).toBe("green");
  });

  it("Refunds $ con color", () => {
    const r = row({ syr_mngr_void_amt: 30, syr_gross_sales: 10000 });
    expect(kpis.refunds(r).color).toBe("yellow");
  });

  it("Voids $ con color", () => {
    const r = row({ syr_reg_void_amt: 60, infs_vta_actual: 10000 });
    expect(kpis.voids(r).color).toBe("yellow");
  });

  it("Meal Replacement Qty #", () => {
    expect(kpis.mealReplacementQty(row({ syr_meal_replacement_qty: 4 }))).toEqual({ value: 4 });
  });

  it("Meal Replacement Amount $ (negado)", () => {
    const r = row({ syr_meal_replacement_amt: 20, infs_vta_actual: 1000 });
    const result = kpis.mealReplacementAmount(r);
    expect(result.value).toBe(-20);
    expect(result.pct).toBeCloseTo(-0.02);
  });
});

describe("Day Part 1 / 2 / 6", () => {
  it("DPn Sales vs Last Week", () => {
    const r = row({ syr_sal_dp2: 1200, syr_sal_dp2_lw: 1000 });
    const result = kpis.dpSalesVsLastWeek(r, 2);
    expect(result.value).toBe(200);
    expect(result.pct).toBeCloseTo(0.2);
  });

  it("DP1 Sales vs LY Comp.", () => {
    const r = row({ syr_sal_dp1_cmp: 1100, syr_sal_dp1_ly: 1000 });
    const result = kpis.dp1SalesVsLYComp(r);
    expect(result.value).toBe(100);
    expect(result.pct).toBeCloseTo(0.1);
  });

  it("DP1 Sales vs LY", () => {
    const r = row({ syr_sal_dp1: 900, syr_sal_dp1_ly: 1000 });
    const result = kpis.dp1SalesVsLY(r);
    expect(result.value).toBe(-100);
    expect(result.pct).toBeCloseTo(-0.1);
  });

  it("DP2/DP6 Sales vs LY usa el comparativo (_cmp), no el valor actual", () => {
    const r = row({ syr_sal_dp2_cmp: 1050, syr_sal_dp2_ly: 1000, syr_sal_dp2: 999999 });
    const result = kpis.dpSalesVsLY(r, 2);
    expect(result.value).toBe(50);
    expect(result.pct).toBeCloseTo(0.05);
  });

  it("Breakfast Labor Hr # (DP1)", () => {
    expect(kpis.breakfastLaborHr(row({ hr_labor_dp1: 8.5 }))).toEqual({ value: 8.5 });
  });

  it("Breakfast Labor $ (DP1): usa SUM(hr_labor_dp1) via hr_labor_dp1_sum", () => {
    const r = row({ syr_labor: 100, syr_crew_hr: 10, hr_labor_dp1_sum: 40, syr_sal_dp1: 200 });
    const result = kpis.breakfastLaborDollars(r);
    // rate = 100/10 = 10; value = 10 * 40 = 400
    expect(result.value).toBe(400);
    expect(result.pct).toBeCloseTo(2);
  });

  it("Breakfast Labor $ (DP1): syr_crew_hr 0 -> vacío", () => {
    const r = row({ syr_labor: 100, syr_crew_hr: 0, hr_labor_dp1_sum: 40, syr_sal_dp1: 200 });
    expect(kpis.breakfastLaborDollars(r).value).toBeUndefined();
  });

  it("DPn Service Time reutiliza dpServiceTime", () => {
    expect(kpis.dpServiceTime(row({ syr_sos_dp1: 140 }), 1)).toEqual({ value: 140, color: "green" });
  });

  it("DPn Car Count reutiliza dpCarCount", () => {
    const r = row({ car_count_dp1: 5, car_count_dp2: 5 });
    expect(kpis.dpCarCount(r, 1)).toEqual({ value: 5, pct: 0.5 });
  });

  it("DPn Car Count vs LW", () => {
    const r = row({ car_count_dp2: 12, car_count_dp2_lw: 10 });
    const result = kpis.dpCarCountVsLastWeek(r, 2);
    expect(result.value).toBe(2);
    expect(result.pct).toBeCloseTo(0.2);
  });

  it("OSAT / ZOD / Problem Resolution por Day Part", () => {
    const r = row({
      smg_overall_dp1: 90,
      smg_count_dp1: 100,
      smg_defzone_dp1: 5,
      smg_problemsol_dp1: 8,
      smg_problemsol_count_dp1: 10,
    });
    expect(kpis.dpOsat(r, 1)).toEqual({ value: undefined, pct: 0.9, color: "green" });
    expect(kpis.dpZod(r, 1)).toEqual({ value: undefined, pct: 0.05, color: "green" });
    expect(kpis.dpProblemResolution(r, 1)).toEqual({ value: undefined, pct: 0.8, color: "green" });
  });
});

describe("SMG - Customer Feedback (general)", () => {
  it("OSAT", () => {
    const result = kpis.osat(row({ smg_overall: 65, smg_count: 100 }));
    expect(result.pct).toBeCloseTo(0.65);
    expect(result.color).toBe("yellow");
  });

  it("ZOD", () => {
    const result = kpis.zod(row({ smg_def_zone: 10, smg_count: 100 }));
    expect(result.pct).toBeCloseTo(0.1);
    expect(result.color).toBe("red");
  });

  it("Problem Resolution", () => {
    const result = kpis.problemResolution(row({ smg_problemsol: 20, smg_problemsol_count: 100 }));
    expect(result.pct).toBeCloseTo(0.2);
    expect(result.color).toBe("red");
  });

  it("OSAT: count 0 -> % vacío", () => {
    expect(kpis.osat(row({ smg_overall: 65, smg_count: 0 })).pct).toBeUndefined();
  });
});

describe("Raw Material Cost", () => {
  it("Food Actual", () => {
    const r = row({ syr_comida_costo_actual: 5000, infs_vta_actual: 25000 });
    expect(kpis.foodActual(r)).toEqual({ value: 5000, pct: 0.2 });
  });

  it("Food Ideal var", () => {
    const r = row({ syr_comida_costo_teorico: 4800, syr_comida_costo_actual: 5000, infs_vta_actual: 25000 });
    const result = kpis.foodIdealVar(r);
    expect(result.value).toBe(-200);
    expect(result.pct).toBeCloseTo(-0.008);
  });

  it("Paper Actual / Paper Ideal var", () => {
    const r = row({ syr_papel_costo_actual: 1000, syr_papel_costo_teorico: 900, infs_vta_actual: 20000 });
    expect(kpis.paperActual(r)).toEqual({ value: 1000, pct: 0.05 });
    expect(kpis.paperIdealVar(r).value).toBe(-100);
  });

  it("Food/Paper Actual = Food Actual + Paper Actual", () => {
    const r = row({ syr_comida_costo_actual: 5000, syr_papel_costo_actual: 1000, infs_vta_actual: 30000 });
    const result = kpis.foodPaperActual(r);
    expect(result.value).toBe(6000);
    expect(result.pct).toBeCloseTo(0.2);
  });

  it("Food/Paper var = Food var + Paper var", () => {
    const r = row({
      syr_comida_costo_teorico: 4800,
      syr_comida_costo_actual: 5000,
      syr_papel_costo_teorico: 900,
      syr_papel_costo_actual: 1000,
      infs_vta_actual: 30000,
    });
    expect(kpis.foodPaperVar(r).value).toBe(-300);
  });

  it("Waste", () => {
    const r = row({ syr_waste: 150, infs_vta_actual: 15000 });
    expect(kpis.waste(r)).toEqual({ value: 150, pct: 0.01 });
  });

  it("Raw Material Cost: NS 0 -> % vacío en todos", () => {
    expect(kpis.foodActual(row({ syr_comida_costo_actual: 100 })).pct).toBeUndefined();
    expect(kpis.waste(row({ syr_waste: 100 })).pct).toBeUndefined();
  });
});

describe("Anomalías del Excel original: versión CORREGIDA (no replicar el Excel)", () => {
  it("Anomalía 1: DP2 Service Time usa syr_sos_dp2, NUNCA syr_sos_dp1", () => {
    const r = row({ syr_sos_dp1: 999, syr_sos_dp2: 155 });
    const result = kpis.dpServiceTime(r, 2);
    expect(result.value).toBe(155);
    expect(result.value).not.toBe(999);
  });

  it("Anomalía 1: DP2 Car Count usa car_count_dp2, NUNCA car_count_dp1", () => {
    const r = row({ car_count_dp1: 999, car_count_dp2: 42 });
    const result = kpis.dpCarCount(r, 2);
    expect(result.value).toBe(42);
    expect(result.value).not.toBe(999);
  });

  it("Anomalía 2: 'DP2 Car Count %' se calcula DIRECTO como car_count_dp2 / Car Count", () => {
    const r = row({
      car_count_dp1: 10,
      car_count_dp2: 30,
      car_count_dp3: 10,
      car_count_dp4: 10,
      car_count_dp5: 10,
      car_count_dp6: 10,
    });
    const total = kpis.carCount(r).value ?? 0; // 80
    const result = kpis.dpCarCount(r, 2);
    // Falla si alguien vuelve a la referencia indirecta del Excel original
    // (por ejemplo, calculando el % contra otro total o reutilizando un valor ya dividido).
    expect(result.pct).toBeCloseTo(30 / total);
    expect(result.pct).toBeCloseTo(0.375);
  });

  it("Anomalía 3: 'Breakfast Labor vs Guide %' divide por hr_guide_dp1, no por otro campo", () => {
    const r = row({ hr_labor_dp1: 12, hr_guide_dp1: 10, hr_guide_dp2: 999 });
    const result = kpis.breakfastLaborVsGuidePct(r);
    expect(result.value).toBe(2);
    // Si dividiera por una celda incorrecta (p.ej. hr_guide_dp2) el % sería otro muy distinto.
    expect(result.pct).toBeCloseTo(2 / 10);
    expect(result.pct).not.toBeCloseTo(2 / 999);
  });

  it("Anomalía 3: breakfastLaborVsGuidePct es equivalente a dpLaborVsGuide(row, 1)", () => {
    const r = row({ hr_labor_dp1: 7, hr_guide_dp1: 5 });
    expect(kpis.breakfastLaborVsGuidePct(r)).toEqual(kpis.dpLaborVsGuide(r, 1));
  });
});
