import { describe, expect, it } from "vitest";
import { getColor } from "./colorThresholds.js";

describe("colorThresholds", () => {
  it("salesVsLastWeekPct: verde >0, amarillo -3%..0, rojo <-3%, límites exactos", () => {
    expect(getColor("salesVsLastWeekPct", 0.0001)).toBe("green");
    expect(getColor("salesVsLastWeekPct", 0)).toBe("yellow");
    expect(getColor("salesVsLastWeekPct", -0.03)).toBe("yellow");
    expect(getColor("salesVsLastWeekPct", -0.02)).toBe("yellow");
    expect(getColor("salesVsLastWeekPct", -0.0301)).toBe("red");
  });

  it("transVsLastYearPct: verde >0, amarillo -1%..0, rojo <-1%", () => {
    expect(getColor("transVsLastYearPct", 0.01)).toBe("green");
    expect(getColor("transVsLastYearPct", -0.01)).toBe("yellow");
    expect(getColor("transVsLastYearPct", 0)).toBe("yellow");
    expect(getColor("transVsLastYearPct", -0.0101)).toBe("red");
  });

  it("couponsPct: verde <2%, amarillo 2%-3%, rojo >3%", () => {
    expect(getColor("couponsPct", 0.0199)).toBe("green");
    expect(getColor("couponsPct", 0.02)).toBe("yellow");
    expect(getColor("couponsPct", 0.03)).toBe("yellow");
    expect(getColor("couponsPct", 0.0301)).toBe("red");
  });

  it("discountsPct: verde <2%, amarillo 2%-3%, rojo >3%", () => {
    expect(getColor("discountsPct", 0.0199)).toBe("green");
    expect(getColor("discountsPct", 0.025)).toBe("yellow");
    expect(getColor("discountsPct", 0.031)).toBe("red");
  });

  it("emplManagerMealsPct: verde <0.52%, amarillo 0.52%-0.75%, rojo >0.75%", () => {
    expect(getColor("emplManagerMealsPct", 0.0051)).toBe("green");
    expect(getColor("emplManagerMealsPct", 0.0052)).toBe("yellow");
    expect(getColor("emplManagerMealsPct", 0.0075)).toBe("yellow");
    expect(getColor("emplManagerMealsPct", 0.0076)).toBe("red");
  });

  it("refundsPct: verde <0.25%, amarillo 0.25%-0.5%, rojo >0.5%", () => {
    expect(getColor("refundsPct", 0.0024)).toBe("green");
    expect(getColor("refundsPct", 0.0025)).toBe("yellow");
    expect(getColor("refundsPct", 0.005)).toBe("yellow");
    expect(getColor("refundsPct", 0.0051)).toBe("red");
  });

  it("managerVoidsPct: verde <0.5%, amarillo 0.5%-1% (exclusivo), rojo >=1%", () => {
    expect(getColor("managerVoidsPct", 0.0049)).toBe("green");
    expect(getColor("managerVoidsPct", 0.005)).toBe("yellow");
    expect(getColor("managerVoidsPct", 0.0099)).toBe("yellow");
    expect(getColor("managerVoidsPct", 0.01)).toBe("red");
  });

  it("cashPct: verde <0.04%, amarillo 0.04%-0.11%, rojo >0.11%", () => {
    expect(getColor("cashPct", 0.0003)).toBe("green");
    expect(getColor("cashPct", 0.0004)).toBe("yellow");
    expect(getColor("cashPct", 0.0011)).toBe("yellow");
    expect(getColor("cashPct", 0.0012)).toBe("red");
  });

  it("avgLaborHrGuidePct: verde <3%, amarillo 3%-6%, rojo >6%", () => {
    expect(getColor("avgLaborHrGuidePct", 0.029)).toBe("green");
    expect(getColor("avgLaborHrGuidePct", 0.03)).toBe("yellow");
    expect(getColor("avgLaborHrGuidePct", 0.06)).toBe("yellow");
    expect(getColor("avgLaborHrGuidePct", 0.0601)).toBe("red");
  });

  it("laborPct: verde <24%, amarillo 24%-28%, rojo >28%", () => {
    expect(getColor("laborPct", 0.239)).toBe("green");
    expect(getColor("laborPct", 0.24)).toBe("yellow");
    expect(getColor("laborPct", 0.28)).toBe("yellow");
    expect(getColor("laborPct", 0.2801)).toBe("red");
  });

  it("osatPct: verde >80%, amarillo 65%-79%, rojo <65%", () => {
    expect(getColor("osatPct", 0.81)).toBe("green");
    expect(getColor("osatPct", 0.65)).toBe("yellow");
    expect(getColor("osatPct", 0.79)).toBe("yellow");
    expect(getColor("osatPct", 0.6499)).toBe("red");
  });

  it("zodPct: verde <=5%, amarillo 6%-9%, rojo >=10%", () => {
    expect(getColor("zodPct", 0.05)).toBe("green");
    expect(getColor("zodPct", 0.06)).toBe("yellow");
    expect(getColor("zodPct", 0.09)).toBe("yellow");
    expect(getColor("zodPct", 0.1)).toBe("red");
  });

  it("problemResolutionPct: verde >=40%, amarillo 21%-39%, rojo <=20%", () => {
    expect(getColor("problemResolutionPct", 0.4)).toBe("green");
    expect(getColor("problemResolutionPct", 0.21)).toBe("yellow");
    expect(getColor("problemResolutionPct", 0.39)).toBe("yellow");
    expect(getColor("problemResolutionPct", 0.2)).toBe("red");
  });

  it("sosDaySeconds: verde <=200, amarillo 201-220, rojo >220", () => {
    expect(getColor("sosDaySeconds", 200)).toBe("green");
    expect(getColor("sosDaySeconds", 201)).toBe("yellow");
    expect(getColor("sosDaySeconds", 220)).toBe("yellow");
    expect(getColor("sosDaySeconds", 221)).toBe("red");
  });

  it("sosDp1Dp2Seconds: verde <=150, amarillo 151-170, rojo >170", () => {
    expect(getColor("sosDp1Dp2Seconds", 150)).toBe("green");
    expect(getColor("sosDp1Dp2Seconds", 151)).toBe("yellow");
    expect(getColor("sosDp1Dp2Seconds", 170)).toBe("yellow");
    expect(getColor("sosDp1Dp2Seconds", 171)).toBe("red");
  });

  it("sosDp3Dp4Seconds: verde <=170, amarillo 171-190, rojo >190", () => {
    expect(getColor("sosDp3Dp4Seconds", 170)).toBe("green");
    expect(getColor("sosDp3Dp4Seconds", 171)).toBe("yellow");
    expect(getColor("sosDp3Dp4Seconds", 190)).toBe("yellow");
    expect(getColor("sosDp3Dp4Seconds", 191)).toBe("red");
  });

  it("sosDp5Seconds: verde <=200, amarillo 201-220, rojo >220", () => {
    expect(getColor("sosDp5Seconds", 200)).toBe("green");
    expect(getColor("sosDp5Seconds", 210)).toBe("yellow");
    expect(getColor("sosDp5Seconds", 221)).toBe("red");
  });

  it("sosDp6Seconds: verde <=250, amarillo 251-270, rojo >270", () => {
    expect(getColor("sosDp6Seconds", 250)).toBe("green");
    expect(getColor("sosDp6Seconds", 260)).toBe("yellow");
    expect(getColor("sosDp6Seconds", 271)).toBe("red");
  });
});
