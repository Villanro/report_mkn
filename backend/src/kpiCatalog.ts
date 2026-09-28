import * as kpis from "./kpis.js";
import type { KpiResult, NumericRow } from "./kpis.js";

/**
 * Catálogo declarativo del diccionario de KPIs de docs/spec-bsc.md, en el orden de la spec,
 * para la pantalla BSC principal (`GET /api/bsc`): una fila por entrada, una columna por día.
 * Incluye OPERATIONS SCORECARD, SMG - CUSTOMER FEEDBACK (general) y RAW MATERIAL COST.
 * Los desgloses jerárquicos de DAY PART 1/2/6 Analysis viven en `GET /api/hierarchy`, no aquí.
 */
export interface KpiCatalogEntry {
  key: string;
  label: string;
  section: "operations" | "smg" | "raw_material";
  compute: (row: NumericRow) => KpiResult;
}

const dp = [1, 2, 3, 4, 5, 6] as const;

export const KPI_CATALOG: KpiCatalogEntry[] = [
  // --- OPERATIONS SCORECARD ---
  { key: "gross_sales", label: "Gross Sales", section: "operations", compute: kpis.grossSales },
  { key: "net_sales", label: "Net Sales", section: "operations", compute: kpis.netSales },
  ...dp.map((n) => ({
    key: `dp${n}_sales`,
    label: `DP${n} Sales`,
    section: "operations" as const,
    compute: (row: NumericRow) => kpis.dpSales(row, n),
  })),
  { key: "puw_sales", label: "PUW Sales", section: "operations", compute: kpis.puwSales },
  { key: "delivery_sales", label: "Delivery Sales", section: "operations", compute: kpis.deliverySales },
  { key: "upsize_pct", label: "Upsize %", section: "operations", compute: kpis.upsizePct },
  { key: "kiosk_total_sales", label: "Kiosk Total Sales", section: "operations", compute: kpis.kioskTotalSales },
  { key: "kiosk_sales", label: "Kiosk Sales", section: "operations", compute: kpis.kioskSales },
  { key: "to_go_sales", label: "TO GO Sales", section: "operations", compute: kpis.toGoSales },
  { key: "mobile_total_sales", label: "Mobile Total Sales", section: "operations", compute: kpis.mobileTotalSales },
  { key: "mobile_in_sales", label: "Mobile IN Sales", section: "operations", compute: kpis.mobileInSales },
  { key: "mobile_to_go_sales", label: "Mobile TO GO Sales", section: "operations", compute: kpis.mobileToGoSales },
  { key: "mobile_puw_sales", label: "Mobile PUW Sales", section: "operations", compute: kpis.mobilePuwSales },
  { key: "handheld_sales", label: "Handheld Sales", section: "operations", compute: kpis.handheldSales },
  { key: "avg_sales_by_store", label: "Average Sales by Store $", section: "operations", compute: kpis.avgSalesByStore },
  { key: "sales_vs_last_week", label: "Sales vs Last Week", section: "operations", compute: kpis.salesVsLastWeek },
  { key: "sales_vs_last_year", label: "Sales vs Last Year", section: "operations", compute: kpis.salesVsLastYear },
  { key: "sales_vs_2_year_ago", label: "Sales vs 2 Year Ago", section: "operations", compute: kpis.salesVs2YearAgo },
  { key: "sales_wtd", label: "Sales WTD", section: "operations", compute: kpis.salesWTD },
  { key: "sales_wtd_last_year", label: "Sales WTD Last Year", section: "operations", compute: kpis.salesWTDLastYear },
  { key: "sales_ptd", label: "Sales PTD", section: "operations", compute: kpis.salesPTD },
  { key: "sales_ptd_last_year", label: "Sales PTD Last Year", section: "operations", compute: kpis.salesPTDLastYear },
  { key: "sales_ytd", label: "Sales YTD", section: "operations", compute: kpis.salesYTD },
  { key: "sales_ytd_last_year", label: "Sales YTD Last Year", section: "operations", compute: kpis.salesYTDLastYear },
  { key: "coupons", label: "Coupons $", section: "operations", compute: kpis.coupons },
  { key: "discounts", label: "Discounts $", section: "operations", compute: kpis.discounts },
  { key: "employee_meals", label: "Employee Meals $", section: "operations", compute: kpis.employeeMeals },
  { key: "manager_meals", label: "Manager Meals $", section: "operations", compute: kpis.managerMeals },
  { key: "transactions", label: "Transactions #", section: "operations", compute: kpis.transactions },
  { key: "avg_trans_by_store", label: "Avg. Trans. by Store #", section: "operations", compute: kpis.avgTransByStore },
  { key: "trans_vs_last_year", label: "Trans vs Last Year #", section: "operations", compute: kpis.transVsLastYear },
  { key: "kiosk_transactions", label: "Kiosk Transactions #", section: "operations", compute: kpis.kioskTransactions },
  { key: "kiosk_in_trans", label: "Kiosk IN Trans #", section: "operations", compute: kpis.kioskInTrans },
  { key: "kiosk_to_go_trans", label: "Kiosk TO GO Trans #", section: "operations", compute: kpis.kioskToGoTrans },
  { key: "mobile_transactions", label: "Mobile Transactions #", section: "operations", compute: kpis.mobileTransactions },
  { key: "mobile_in_trans", label: "Mobile IN Trans #", section: "operations", compute: kpis.mobileInTrans },
  { key: "mobile_to_go_trans", label: "Mobile TO GO Trans #", section: "operations", compute: kpis.mobileToGoTrans },
  { key: "mobile_puw_trans", label: "Mobile PUW Trans #", section: "operations", compute: kpis.mobilePuwTrans },
  { key: "handheld_transactions", label: "Handheld Transactions #", section: "operations", compute: kpis.handheldTransactions },
  { key: "ticket_average", label: "Ticket Average $", section: "operations", compute: kpis.ticketAverage },
  { key: "ticket_average_last_year", label: "Ticket Average Last Year $", section: "operations", compute: kpis.ticketAverageLastYear },
  { key: "labor_hr_guide", label: "Labor HR (+/- guide)", section: "operations", compute: kpis.laborHrGuide },
  ...dp.map((n) => ({
    key: `dp${n}_labor_vs_guide`,
    label: `DP${n} Labor +/- Guide`,
    section: "operations" as const,
    compute: (row: NumericRow) => kpis.dpLaborVsGuide(row, n),
  })),
  { key: "avg_labor_hr_guide", label: "Avg. Labor HR +/- Guide", section: "operations", compute: kpis.avgLaborHrGuide },
  { key: "labor_pct_target_vs_actual", label: "Labor % (Target vs Actual)", section: "operations", compute: kpis.laborPctTargetVsActual },
  { key: "labor_crew_pct", label: "Labor Crew %", section: "operations", compute: kpis.laborCrewPct },
  { key: "labor_ssv_pct", label: "Labor SSV %", section: "operations", compute: kpis.laborSsvPct },
  { key: "labor_manager_pct", label: "Labor Manager %", section: "operations", compute: kpis.laborManagerPct },
  { key: "wtd_overtime_hr_pct", label: "WTD Overtime Hr. %", section: "operations", compute: kpis.wtdOvertimeHrPct },
  { key: "service_time", label: "Service Time", section: "operations", compute: kpis.serviceTime },
  ...dp.map((n) => ({
    key: `dp${n}_sos`,
    label: `DP${n} SOS`,
    section: "operations" as const,
    compute: (row: NumericRow) => kpis.dpServiceTime(row, n),
  })),
  { key: "car_count", label: "Car Count", section: "operations", compute: kpis.carCount },
  ...dp.map((n) => ({
    key: `dp${n}_car_count`,
    label: `DP${n} Car Count`,
    section: "operations" as const,
    compute: (row: NumericRow) => kpis.dpCarCount(row, n),
  })),
  { key: "spmh_target_vs_actual", label: "SPMH $ (Target vs Actual)", section: "operations", compute: kpis.spmhTargetVsActual },
  { key: "tpmh", label: "TPMH #", section: "operations", compute: kpis.tpmh },
  { key: "cash_plus_minus", label: "Cash +/-", section: "operations", compute: kpis.cashPlusMinus },
  { key: "refunds", label: "Refunds $", section: "operations", compute: kpis.refunds },
  { key: "voids", label: "Voids $", section: "operations", compute: kpis.voids },
  { key: "meal_replacement_qty", label: "Meal Replacement Qty #", section: "operations", compute: kpis.mealReplacementQty },
  { key: "meal_replacement_amount", label: "Meal Replacement Amount $", section: "operations", compute: kpis.mealReplacementAmount },

  // --- SMG - CUSTOMER FEEDBACK (general) ---
  { key: "osat", label: "OSAT", section: "smg", compute: kpis.osat },
  { key: "zod", label: "ZOD", section: "smg", compute: kpis.zod },
  { key: "problem_resolution", label: "Problem Resolution", section: "smg", compute: kpis.problemResolution },

  // --- RAW MATERIAL COST ---
  { key: "food_actual", label: "Food Actual", section: "raw_material", compute: kpis.foodActual },
  { key: "food_ideal_var", label: "Food Ideal var", section: "raw_material", compute: kpis.foodIdealVar },
  { key: "paper_actual", label: "Paper Actual", section: "raw_material", compute: kpis.paperActual },
  { key: "paper_ideal_var", label: "Paper Ideal var", section: "raw_material", compute: kpis.paperIdealVar },
  { key: "food_paper_actual", label: "Food/Paper Actual", section: "raw_material", compute: kpis.foodPaperActual },
  { key: "food_paper_var", label: "Food/Paper var", section: "raw_material", compute: kpis.foodPaperVar },
  { key: "waste", label: "Waste", section: "raw_material", compute: kpis.waste },
];
