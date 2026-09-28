import { describe, expect, it } from "vitest";
import { getLaborPctTarget, getSpmhTarget } from "./targetTables.js";

describe("Tabla A - Labor % target", () => {
  it.each([
    [4286, 0.255],
    [5000, 0.245],
    [5714, 0.235],
    [6429, 0.225],
    [7143, 0.215],
    [7857, 0.205],
    [8571, 0.195],
    [9286, 0.185],
  ])("corte %i -> %s (límite exacto)", (avgSales, expected) => {
    expect(getLaborPctTarget(avgSales)).toBeCloseTo(expected);
  });

  it("un centavo por debajo de un corte usa el corte actual", () => {
    expect(getLaborPctTarget(4285.99)).toBeCloseTo(0.255);
  });

  it("un centavo por encima de un corte cae en el siguiente", () => {
    expect(getLaborPctTarget(4286.01)).toBeCloseTo(0.245);
  });

  it("mayor que el último corte -> 17.75%", () => {
    expect(getLaborPctTarget(9286.01)).toBeCloseTo(0.1775);
    expect(getLaborPctTarget(1_000_000)).toBeCloseTo(0.1775);
  });
});

describe("Tabla B - SPMH target", () => {
  it.each([
    [3571, 38],
    [4286, 46],
    [5000, 48],
    [5714, 55],
    [6429, 59],
    [7143, 63],
    [7857, 65],
    [8571, 68],
    [9286, 70],
  ])("corte %i -> %s (límite exacto)", (avgSales, expected) => {
    expect(getSpmhTarget(avgSales)).toBe(expected);
  });

  it("un centavo por debajo de un corte usa el corte actual", () => {
    expect(getSpmhTarget(3570.99)).toBe(38);
  });

  it("un centavo por encima de un corte cae en el siguiente", () => {
    expect(getSpmhTarget(3571.01)).toBe(46);
  });

  it("mayor que el último corte -> 72", () => {
    expect(getSpmhTarget(9286.01)).toBe(72);
    expect(getSpmhTarget(1_000_000)).toBe(72);
  });
});
