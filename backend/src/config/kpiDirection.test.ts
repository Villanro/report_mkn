import { describe, expect, it } from "vitest";
import { getKpiDirection, KPI_DIRECTIONS } from "./kpiDirection.js";
import { COLOR_THRESHOLDS } from "./colorThresholds.js";

describe("kpiDirection", () => {
  it.each([
    ["netSales", "higherIsBetter"],
    ["grossSales", "higherIsBetter"],
    ["transactions", "higherIsBetter"],
    ["salesWTD", "higherIsBetter"],
    ["salesPTD", "higherIsBetter"],
    ["salesYTD", "higherIsBetter"],
  ])("%s: más alto = mejor", (name, expected) => {
    expect(getKpiDirection(name)).toBe(expected);
  });

  it.each([
    ["coupons"], // en realidad tiene color propio, no debe estar en esta tabla
  ])("%s no está en la tabla porque ya tiene color (coupons/discounts/voids/refunds)", (name) => {
    expect(getKpiDirection(name)).toBeUndefined();
  });

  it.each([
    ["mealReplacementQty", "lowerIsBetter"],
    ["mealReplacementAmount", "lowerIsBetter"],
    ["waste", "lowerIsBetter"],
    ["foodActual", "lowerIsBetter"],
    ["paperActual", "lowerIsBetter"],
    ["foodPaperActual", "lowerIsBetter"],
  ])("%s (costo crudo): más bajo = mejor, no 'valor numérico más bajo primero' genérico invertido", (name, expected) => {
    expect(getKpiDirection(name)).toBe(expected);
  });

  it("Sanity check del bug reportado: la peor tienda por Coupons $ NO es la de $0 en cupones", () => {
    // Coupons $ tiene color propio (rojo = > 3%), por lo que rank_stores NO debe
    // usar esta tabla para Coupons — debe usar getColor('couponsPct', pct) donde
    // rojo=peor. Confirmamos que couponsPct efectivamente clasifica 0% como verde
    // (mejor), no como peor.
    expect(COLOR_THRESHOLDS.couponsPct.green.max).toBeGreaterThan(0);
    expect(getKpiDirection("coupons")).toBeUndefined();
  });

  it("las varianzas de costo (teórico - actual) son higherIsBetter: un valor más alto es buen control de costo", () => {
    expect(getKpiDirection("foodIdealVar")).toBe("higherIsBetter");
    expect(getKpiDirection("paperIdealVar")).toBe("higherIsBetter");
    expect(getKpiDirection("foodPaperVar")).toBe("higherIsBetter");
  });

  it("labor por encima de guía (horas y $ sin color propio): más bajo = mejor", () => {
    expect(getKpiDirection("dpLaborVsGuide")).toBe("lowerIsBetter");
    expect(getKpiDirection("avgLaborHrGuide")).toBe("lowerIsBetter");
    expect(getKpiDirection("wtdOvertimeHrPct")).toBe("lowerIsBetter");
    expect(getKpiDirection("breakfastLaborHr")).toBe("lowerIsBetter");
    expect(getKpiDirection("breakfastLaborDollars")).toBe("lowerIsBetter");
  });

  it("productividad de labor (SPMH/TPMH): más alto = mejor", () => {
    expect(getKpiDirection("spmhTargetVsActual")).toBe("higherIsBetter");
    expect(getKpiDirection("tpmh")).toBe("higherIsBetter");
  });

  it("KPI desconocido -> undefined (rank_stores debe manejar este caso, no asumir dirección)", () => {
    expect(getKpiDirection("kpiQueNoExiste")).toBeUndefined();
  });

  it("todos los valores de la tabla son 'higherIsBetter' o 'lowerIsBetter'", () => {
    for (const direction of Object.values(KPI_DIRECTIONS)) {
      expect(["higherIsBetter", "lowerIsBetter"]).toContain(direction);
    }
  });

  it("ningún KPI con color propio está también en la tabla de dirección (evita reglas contradictorias)", () => {
    const koloredMetricNames = new Set(Object.keys(COLOR_THRESHOLDS));
    // Nombres de función de kpis.ts que usan colorThresholds directamente (ver kpis.ts).
    const kpiFunctionsWithColor = [
      "salesVsLastWeek",
      "salesVsLastYear",
      "coupons",
      "discounts",
      "employeeMeals",
      "managerMeals",
      "transVsLastYear",
      "laborHrGuide",
      "laborPctTargetVsActual",
      "serviceTime",
      "dpServiceTime",
      "cashPlusMinus",
      "refunds",
      "voids",
      "dpOsat",
      "dpZod",
      "dpProblemResolution",
      "osat",
      "zod",
      "problemResolution",
    ];
    expect(koloredMetricNames.size).toBeGreaterThan(0);
    for (const fn of kpiFunctionsWithColor) {
      expect(getKpiDirection(fn)).toBeUndefined();
    }
  });
});
