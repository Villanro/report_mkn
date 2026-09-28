/**
 * Fila de la vista ORDS `view_bsc_diario_rest` (una tienda, un día).
 *
 * Los campos de dimensión (string) y todos los campos numéricos referenciados
 * explícitamente en el diccionario de KPIs de docs/spec-bsc.md están tipados.
 * La vista real trae ~255 columnas numéricas; las que no aparecen nombradas
 * en la spec caen en el índice de firma de abajo. Completar/ajustar este tipo
 * en cuanto se disponga de una respuesta real de ORDS.
 */
export interface OrdsRow {
  // --- Dimensiones / jerarquía / filtros (string) ---
  tie_bsc_descripcion: string;
  bsc_fecha: string;
  bsc_company: string;
  division: string;
  area: string;
  district: string;
  store: string;
  building: string;
  region: string;
  tie_care_status: string;

  // --- Conteo de tiendas ---
  uno: number;

  // --- Ventas ---
  syr_gross_sales: number;
  infs_vta_actual: number; // Net Sales (NS)
  syr_sal_dp1: number;
  syr_sal_dp2: number;
  syr_sal_dp3: number;
  syr_sal_dp4: number;
  syr_sal_dp5: number;
  syr_sal_dp6: number;
  syr_sal_puw: number;
  syr_delivery: number;
  syr_upsize_pct: number;
  syr_sal_llevar: number;

  // --- Kiosk ---
  kiosk_in_sales: number;
  kiosk_out_sales: number;
  kiosk_sales_ref: number;
  kiosk_in_trans: number;
  kiosk_out_trans: number;
  kiosk_trans_ref: number;

  // --- Mobile ---
  mobile_in_sales: number;
  mobile_out_sales: number;
  mobile_puw_sales: number;
  mobile_sales_ref: number;
  mobile_in_trans: number;
  mobile_out_trans: number;
  mobile_puw_trans: number;
  mobile_trans_ref: number;

  // --- Handheld ---
  syr_handheld_sales: number;
  syr_handheld_sales_ref: number;
  syr_handheld_trans: number;
  syr_handheld_trans_ref: number;

  // --- Comparativos de ventas ---
  syr_net_sales_lw: number;
  syr_net_sales_cmp_ly: number;
  syr_net_sales_ly: number;
  syr_net_sales_cmp_ly2: number;
  syr_net_sales_ly2: number;

  // --- WTD / PTD / YTD ---
  syr4_gross_sales: number;
  syr4_gross_sal_ly: number;
  syr4_gross_sales_cmp: number;
  syr3_gross_sales: number;
  syr3_gross_sal_ly: number;
  syr3_gross_sales_cmp: number;
  syr5_gross_sales: number;
  syr5_gross_sal_ly: number;

  // --- Descuentos / cupones / comidas ---
  syr_coupons: number;
  syr_discounts: number;
  syr_empl_meal: number;
  syr_mngr_meal: number;

  // --- Transacciones ---
  syr_trans: number;
  syr_trans_cmp_ly: number;
  syr_trans_ly: number;
  syr_trans_hr: number;

  // --- Labor ---
  syr_crew_hr: number;
  syr_mngr_hr: number;
  syr_guid_hr: number;
  syr_labor: number;
  syr_crew_labor: number;
  syr_ssv_labor: number;
  syr_mngr_labor: number;
  syr_labor_sales_ref: number;
  syr4_ovt_hr: number;
  syr4_hr: number;

  hr_labor_dp1: number;
  hr_labor_dp2: number;
  hr_labor_dp3: number;
  hr_labor_dp4: number;
  hr_labor_dp5: number;
  hr_labor_dp6: number;
  hr_guide_dp1: number;
  hr_guide_dp2: number;
  hr_guide_dp3: number;
  hr_guide_dp4: number;
  hr_guide_dp5: number;
  hr_guide_dp6: number;

  // --- Service time / SOS ---
  syr_service_time: number;
  syr_sos_dp1: number;
  syr_sos_dp2: number;
  syr_sos_dp3: number;
  syr_sos_dp4: number;
  syr_sos_dp5: number;
  syr_sos_dp6: number;

  // --- Car count ---
  car_count_dp1: number;
  car_count_dp2: number;
  car_count_dp3: number;
  car_count_dp4: number;
  car_count_dp5: number;
  car_count_dp6: number;
  // Solo DP1/DP2/DP6 traen comparativo LW en ORDS real (verificado contra datos reales el
  // 2026-09-28); DP3/DP4/DP5 no existen como columna — no se declaran aquí para no sugerir
  // que existen. kpis.ts solo las invoca para 1/2/6 (secciones DP1/DP2/DP6 Analysis).
  car_count_dp1_lw: number;
  car_count_dp2_lw: number;
  car_count_dp6_lw: number;

  // --- Cash / voids / refunds / meal replacement ---
  syr_cash_mm: number;
  syr_mngr_void_amt: number;
  syr_reg_void_amt: number;
  syr_meal_replacement_qty: number;
  syr_meal_replacement_amt: number;

  // --- Day Part sales vs LW/LY (DP1, DP2, DP6) ---
  syr_sal_dp1_lw: number;
  syr_sal_dp2_lw: number;
  syr_sal_dp6_lw: number;
  syr_sal_dp1_cmp: number;
  syr_sal_dp1_ly: number;
  syr_sal_dp2_cmp: number;
  syr_sal_dp2_ly: number;
  syr_sal_dp6_cmp: number;
  syr_sal_dp6_ly: number;

  // --- SMG - Customer Feedback (general + DP1, DP2, DP4, DP6) ---
  smg_overall: number;
  smg_count: number;
  smg_def_zone: number;
  smg_problemsol: number;
  smg_problemsol_count: number;

  smg_overall_dp1: number;
  smg_count_dp1: number;
  smg_defzone_dp1: number;
  smg_problemsol_dp1: number;
  smg_problemsol_count_dp1: number;

  smg_overall_dp2: number;
  smg_count_dp2: number;
  smg_defzone_dp2: number;
  smg_problemsol_dp2: number;
  smg_problemsol_count_dp2: number;

  smg_overall_dp4: number;
  smg_count_dp4: number;
  smg_defzone_dp4: number;
  smg_problemsol_dp4: number;
  smg_problemsol_count_dp4: number;

  smg_overall_dp6: number;
  smg_count_dp6: number;
  smg_defzone_dp6: number;
  smg_problemsol_dp6: number;
  smg_problemsol_count_dp6: number;

  // --- Raw material cost ---
  syr_comida_costo_actual: number;
  syr_comida_costo_teorico: number;
  syr_papel_costo_actual: number;
  syr_papel_costo_teorico: number;
  syr_waste: number;

  // Cubre el resto de las ~255 columnas numéricas de la vista aún no documentadas explícitamente.
  [key: string]: number | string | undefined;
}
