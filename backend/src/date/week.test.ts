import { describe, expect, it } from "vitest";
import type { OrdsRow } from "../types/ordsRow.js";
import { getAvailableDays, resolveWeekDays } from "./week.js";

function row(bsc_fecha: string, tie_bsc_descripcion: string): OrdsRow {
  return { bsc_fecha, tie_bsc_descripcion } as unknown as OrdsRow;
}

describe("getAvailableDays", () => {
  it("ordena cronológicamente por la fecha real de tie_bsc_descripcion, no por bsc_fecha", () => {
    // bsc_fecha real de ORDS no es ISO (ej. "6.- Sat 09/26/2026"): ordenar por ese string
    // mezclaría semanas distintas (todos los "1.-" antes que todos los "2.-").
    const rows = [
      row("7.- Sun 09/27/2026", "26P09W4 - 09/27/2026"),
      row("1.- Mon 09/14/2026", "26P09W3 - 09/14/2026"),
      row("1.- Mon 09/21/2026", "26P09W4 - 09/21/2026"),
      row("2.- Tue 09/22/2026", "26P09W4 - 09/22/2026"),
    ];

    expect(getAvailableDays(rows).map((d) => d.bsc_fecha)).toEqual([
      "1.- Mon 09/14/2026",
      "1.- Mon 09/21/2026",
      "2.- Tue 09/22/2026",
      "7.- Sun 09/27/2026",
    ]);
  });
});

describe("resolveWeekDays", () => {
  it("resuelve la semana más reciente por defecto, ordenada cronológicamente", () => {
    const rows = [
      row("1.- Mon 09/14/2026", "26P09W3 - 09/14/2026"),
      row("1.- Mon 09/21/2026", "26P09W4 - 09/21/2026"),
      row("2.- Tue 09/22/2026", "26P09W4 - 09/22/2026"),
    ];

    const week = resolveWeekDays(rows);
    expect(week.map((d) => d.bsc_fecha)).toEqual(["1.- Mon 09/21/2026", "2.- Tue 09/22/2026"]);
  });
});
