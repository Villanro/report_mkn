/** Formatea moneda: 2 decimales, separador de miles, negativos entre paréntesis. */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `($${formatted})` : `$${formatted}`;
}

/** Formatea porcentaje: 1 decimal, negativos entre paréntesis. Espera un valor ya en escala 0-100 o fracción; usar isFraction para indicar cuál. */
export function formatPercent(
  value: number | null | undefined,
  isFraction = true
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const pct = isFraction ? value * 100 : value;
  const abs = Math.abs(pct);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return pct < 0 ? `(${formatted}%)` : `${formatted}%`;
}

/** Formatea segundos de SOS: entero o 1 decimal, negativos entre paréntesis. */
export function formatSeconds(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const abs = Math.abs(value);
  const isWhole = Number.isInteger(abs);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: isWhole ? 0 : 1,
    maximumFractionDigits: 1,
  });
  return value < 0 ? `(${formatted})` : formatted;
}

/** Formatea un número entero simple (conteos), negativos entre paréntesis. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return value < 0 ? `(${formatted})` : formatted;
}

/** Conteos/horas sin símbolo de moneda (Transactions #, Car Count, Labor HR +/- Guide, TPMH #...):
 * separador de miles, hasta 2 decimales solo si hacen falta, negativos entre paréntesis. */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return value < 0 ? `(${formatted})` : formatted;
}
