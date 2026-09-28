# Proyecto: Daily Balanced Scorecard (BSC) web — reemplazo de un Excel

## Objetivo
Construir una aplicación web que replique el reporte Excel "Daily_BSC" de Popeyes (AETOS Bahamas).
Hoy el Excel baja datos de una API REST de Oracle (ORDS), los resume con tablas dinámicas y aplica
colores según umbrales. La web debe mostrar exactamente los mismos KPIs, cálculos y colores.

## Stack
- Monorepo: `/backend` (Node 20 + TypeScript + Express) y `/frontend` (React + Vite + TypeScript + Tailwind).
- Sin base de datos propia al inicio: el backend consume ORDS y cachea en memoria (TTL configurable, 10 min por defecto).
- Configuración en `.env` (NO commitear): `ORDS_URL`, `CACHE_TTL_MIN`, `PORT`.
- Docker Compose para desplegar en un contenedor LXC de Proxmox (Linux). Zona horaria configurable.

## Fuente de datos
- `ORDS_URL=https://<host>.adb.us-ashburn-1.oraclecloudapps.com/ords/popeyes/view_bsc_diario_rest/`
- Respuesta JSON estándar de ORDS: `{ items: [...], hasMore, limit, offset, links: [{rel:"next", href}] }`.
- Paginar siempre siguiendo `links[rel=next]` mientras `hasMore` sea true (usar `limit=500`). No depender de un límite fijo.
- Cada fila = una tienda en un día. Campos clave:
  - Día: `tie_bsc_descripcion` (texto tipo `"26P09W4 - 09/26/2026"`: año, periodo, semana y fecha), `bsc_fecha`.
  - Jerarquía: `bsc_company` > `division` > `area` > `district` > `store` (ej. `"15144 - Mackey Street (A01-D201)"`).
  - Otros filtros: `building`, `region`, `tie_care_status`.
  - `uno` = 1 por tienda (sirve para contar tiendas).
- La vista trae ~255 columnas numéricas. Define un tipo TypeScript con todas (genéralo a partir de una respuesta real).
- Normaliza nulls a 0 en los campos numéricos.

## Agregación (replica las tablas dinámicas)
Al agrupar varias tiendas (total, división, área, distrito), para cada día:
- **SUMA** en todos los campos EXCEPTO estos, que se agregan con **PROMEDIO**:
  `syr_service_time`, `syr_sos_dp1..dp6`, `hr_labor_dp1..dp6`, `hr_guide_dp1..dp6`, `syr_upsize_pct`.
- Después de agregar se calculan los KPIs (nunca promediar ratios: ratio = suma/suma).
- Nota: en el Excel "Breakfast Labor $" usa la SUMA de `hr_labor_dp1` (no el promedio). Respétalo.

## Pantallas
1. **BSC principal** (`/`): una fila por KPI y una columna por día (7 días: del domingo al sábado de la semana,
   ordenados del más antiguo al más reciente). Cada día muestra: valor ($/#) y % (cuando aplique), con color.
   Encabezado de día = `tie_bsc_descripcion` sin los 2 primeros caracteres.
   Filtros (tipo segmentación de Excel, multi-select): Company, Division, Area, District, Store, Building, Region, Care Status.
   Aviso de validación: si Net Sales del BSC ≠ Net Sales total de los datos filtrados, mostrar "VERIFICAR SELECTOR".
2. **All Detail** (`/detail`): selector de día; tabla jerárquica expandible División > Área > Distrito > Tienda con
   Gross Sales, Net Sales y ventas DP1..DP6.
3. **DP1 / DP2 / DP6 Analysis** (`/dp/1`, `/dp/2`, `/dp/6`): selector de día, jerarquía Área > Distrito > Tienda con las
   métricas de su sección (ver abajo).
4. **Delivery Analysis** (`/delivery`): por tienda/jerarquía, por cada día: Delivery $ (`syr_delivery`) y Delivery % (= syr_delivery / net sales).
5. **SOS** (`/sos`): tiempo de servicio (`syr_service_time`, promedio) por día, con 3 niveles de vista: por Área (DAO),
   por Distrito (DM) y por Tienda.
6. **Detalle de tienda** (`/store/:id`): el BSC principal filtrado a una sola tienda (clic en una tienda en cualquier tabla).

## Diccionario de KPIs (definiciones exactas, por día)
Abreviaturas: `NS` = `infs_vta_actual` (Net Sales). Si el divisor es 0 → mostrar vacío (o 0 donde se indica).

### OPERATIONS SCORECARD
| KPI | Valor | % |
|---|---|---|
| Gross Sales | syr_gross_sales | – |
| Net Sales | NS | – |
| * DP1..DP6 | syr_sal_dpN | syr_sal_dpN / NS |
| PUW Sales | syr_sal_puw | / NS |
| Delivery Sales | syr_delivery | / NS |
| Upsize % | – | syr_upsize_pct (promedio) |
| Kiosk Total Sales | kiosk_in_sales + kiosk_out_sales | / kiosk_sales_ref |
| Kiosk Sales | kiosk_in_sales | / kiosk_sales_ref |
| TO GO Sales | syr_sal_llevar | / NS |
| Mobile Total Sales | mobile_in_sales + mobile_out_sales + mobile_puw_sales | / mobile_sales_ref |
| Mobile IN / TO GO / PUW Sales | mobile_in_sales / mobile_out_sales / mobile_puw_sales | / mobile_sales_ref |
| Handheld Sales | syr_handheld_sales | / syr_handheld_sales_ref |
| Average Sales by Store $ | NS / uno | – |
| Sales vs Last Week | NS − syr_net_sales_lw | (NS − lw) / lw |
| Sales vs Last Year | syr_net_sales_cmp_ly − syr_net_sales_ly | / syr_net_sales_ly |
| Sales vs 2 Year Ago | syr_net_sales_cmp_ly2 − syr_net_sales_ly2 | / syr_net_sales_ly2 |
| Sales WTD | syr4_gross_sales | – |
| Sales WTD Last Year | syr4_gross_sal_ly | syr4_gross_sales_cmp / syr4_gross_sal_ly − 1 |
| Sales PTD | syr3_gross_sales | – |
| Sales PTD Last Year | syr3_gross_sal_ly | syr3_gross_sales_cmp / syr3_gross_sal_ly − 1 |
| Sales YTD | syr5_gross_sales | – |
| Sales YTD Last Year | syr5_gross_sal_ly | syr5_gross_sales / syr5_gross_sal_ly − 1 |
| Coupons $ | syr_coupons | / NS |
| Discounts $ | syr_discounts | / NS |
| Employee Meals $ | syr_empl_meal | / NS |
| Manager Meals $ | syr_mngr_meal | / NS |
| Transactions # | syr_trans | – |
| Avg. Trans. by Store # | syr_trans / uno | – |
| Trans vs Last Year # | syr_trans_cmp_ly − syr_trans_ly | / syr_trans_ly |
| Kiosk Transactions # | kiosk_in_trans + kiosk_out_trans | / kiosk_trans_ref |
| Kiosk IN / TO GO Trans # | kiosk_in_trans / kiosk_out_trans | / kiosk_trans_ref |
| Mobile Transactions # | mobile_in_trans + mobile_out_trans + mobile_puw_trans | / mobile_trans_ref |
| Mobile IN / TO GO / PUW Trans # | cada uno | / mobile_trans_ref |
| Handheld Transactions # | syr_handheld_trans | / syr_handheld_trans_ref |
| Ticket Average $ | NS / syr_trans | – |
| Ticket Average Last Year $ | syr_net_sales_ly / syr_trans_ly | – |
| Labor HR (+/- guide) | (syr_crew_hr + syr_mngr_hr) − syr_guid_hr | / syr_guid_hr |
| * DP1..DP6 labor | hr_labor_dpN − hr_guide_dpN (promedios) | / hr_guide_dpN |
| Avg. Labor HR +/- Guide | LaborHR / uno | – |
| Labor % (Target vs Actual) | Target según tabla A (por Avg Sales by Store) | Actual = syr_labor / NS |
| Labor Crew % / SSV % / Manager % | – | syr_crew_labor / syr_ssv_labor / syr_mngr_labor ÷ syr_labor_sales_ref |
| WTD Overtime Hr. % | – | syr4_ovt_hr / syr4_hr |
| Service Time | syr_service_time (prom.) | – |
| * DP1..DP6 SOS | syr_sos_dpN (prom.) | – |
| Car Count | Σ car_count_dp1..dp6 | – |
| * DP1..DP6 | car_count_dpN | / Car Count |
| SPMH $ (Target vs Actual) | Target según tabla B | Actual = NS / (syr_crew_hr + syr_mngr_hr) |
| TPMH # | syr_trans_hr / (syr_crew_hr + syr_mngr_hr) | – |
| Cash +/- | syr_cash_mm | ABS(valor) / NS |
| Refunds $ | syr_mngr_void_amt | / syr_gross_sales |
| Voids $ | syr_reg_void_amt | / NS |
| Meal Replacement Qty # | syr_meal_replacement_qty | – |
| Meal Replacement Amount $ | −syr_meal_replacement_amt | / NS |

**Tabla A – Labor % target** (por Avg Sales by Store): ≤4286→25.5%, ≤5000→24.5%, ≤5714→23.5%, ≤6429→22.5%,
≤7143→21.5%, ≤7857→20.5%, ≤8571→19.5%, ≤9286→18.5%, mayor→17.75%.
**Tabla B – SPMH target**: ≤3571→38, ≤4286→46, ≤5000→48, ≤5714→55, ≤6429→59, ≤7143→63, ≤7857→65, ≤8571→68, ≤9286→70, mayor→72.
(Guárdalas como configuración, no hardcodeadas en componentes.)

### DAY PART 1 (Breakfast) — también DP2 (Lunch) y DP6 (LTN) con sus campos
| KPI | Valor | % |
|---|---|---|
| DPn Sales | syr_sal_dpN | / NS |
| DPn Sales vs Last Week | syr_sal_dpN − syr_sal_dpN_lw | / syr_sal_dpN_lw |
| DP1 Sales vs LY Comp. (solo DP1) | syr_sal_dp1_cmp − syr_sal_dp1_ly | / syr_sal_dp1_ly |
| DP1 Sales vs LY (solo DP1) | syr_sal_dp1 − syr_sal_dp1_ly | / syr_sal_dp1_ly |
| DP2/DP6 Sales vs LY | syr_sal_dpN_cmp − syr_sal_dpN_ly | / syr_sal_dpN_ly |
| Labor vs Guide +/- | hr_labor_dpN − hr_guide_dpN | / hr_guide_dpN |
| Breakfast Labor Hr # (DP1) | hr_labor_dp1 | – |
| Breakfast Labor $ (DP1) | syr_labor / syr_crew_hr × SUM(hr_labor_dp1) | / syr_sal_dp1 |
| DPn Service Time | syr_sos_dpN | – |
| DPn Car Count | car_count_dpN | / Car Count |
| DPn Car Count vs LW | car_count_dpN − car_count_dpN_lw | / car_count_dpN_lw |
| OSAT | smg_overall_dpN / smg_count_dpN | |
| ZOD | smg_defzone_dpN / smg_count_dpN | |
| Problem Resolution | smg_problemsol_dpN / smg_problemsol_count_dpN | |

### SMG – CUSTOMER FEEDBACK
OSAT = smg_overall / smg_count; ZOD = smg_def_zone / smg_count; Problem Resolution = smg_problemsol / smg_problemsol_count;
y lo mismo por DP1, DP2, DP4 y DP6 con los campos `_dpN`.

### RAW MATERIAL COST
| KPI | Valor | % (/ NS) |
|---|---|---|
| Food Actual | syr_comida_costo_actual | ✓ |
| Food Ideal var | syr_comida_costo_teorico − syr_comida_costo_actual | ✓ |
| Paper Actual | syr_papel_costo_actual | ✓ |
| Paper Ideal var | syr_papel_costo_teorico − syr_papel_costo_actual | ✓ |
| Food/Paper Actual | Food Actual + Paper Actual | ✓ |
| Food/Paper var | Food var + Paper var | ✓ |
| Waste | syr_waste | ✓ |

## Reglas de color (verde / amarillo / rojo) — ponlas en un archivo de configuración
| Métrica (sobre el %) | Verde | Amarillo | Rojo |
|---|---|---|---|
| Sales vs Last Week % | > 0 | −3% a 0 | < −3% |
| Sales vs Last Year % | > 0 | −3% a 0 | < −3% |
| Trans vs Last Year % | > 0 | −1% a 0 | < −1% |
| Coupons % | < 2% | 2%–3% | > 3% |
| Discounts % | < 2% | 2%–3% | > 3% |
| Empl/Manager Meals % | < 0.52% | 0.52%–0.75% | > 0.75% |
| Refunds % | < 0.25% | 0.25%–0.5% | > 0.5% |
| Manager Voids % | < 0.5% | 0.5%–1% | ≥ 1% |
| Cash +/- % | < 0.04% | 0.04%–0.11% | > 0.11% |
| Avg Labor HR +/- Guide % | < 3% | 3%–6% | > 6% |
| Labor % | < 24% | 24%–28% | > 28% |
| OSAT % | > 80% | 65%–79% | < 65% |
| ZOD % | ≤ 5% | 6%–9% | ≥ 10% |
| Problem Resolution % | ≥ 40% | 21%–39% | ≤ 20% |
| SOS día (seg) | ≤ 200 | 201–220 | > 220 |
| SOS DP1 / DP2 | ≤ 150 | 151–170 | > 170 |
| SOS DP3 / DP4 | ≤ 170 | 171–190 | > 190 |
| SOS DP5 | ≤ 200 | 201–220 | > 220 |
| SOS DP6 | ≤ 250 | 251–270 | > 270 |

## Formato
- $ con 2 decimales y separador de miles; % con 1 decimal; SOS en segundos (entero o 1 decimal); negativos entre paréntesis.
- Diseño limpio, tablas con encabezado fijo y primera columna fija, responsive; modo impresión/PDF.

## API del backend
- `GET /api/days` → lista de días disponibles.
- `GET /api/filters` → valores únicos de cada filtro (respetando filtros en cascada).
- `GET /api/bsc?division=&area=&district=&store=&...` → KPIs por día (ya calculados + color).
- `GET /api/hierarchy?day=&level=area|district|store&section=detail|dp1|dp2|dp6|delivery|sos` → filas jerárquicas.
- `POST /api/refresh` → invalida la caché (equivale a la macro "GetData").
- La lógica de KPIs y colores debe vivir en un módulo puro (`backend/src/kpis.ts`) con tests unitarios (Vitest).

## Seguridad
- El frontend NUNCA llama a ORDS directamente; solo al backend.
- Login simple (usuario/contraseña con hash bcrypt, JWT en cookie httpOnly) y, en el futuro, restricción por distrito/tienda por usuario.
- No incluir credenciales ni URLs sensibles en el código; todo por `.env`.

## Anomalías del Excel original (NO replicar; implementar la versión corregida y documentarla en el README)
- En la sección DP2 las filas de Service Time y Car Count están rotuladas "DP1", pero usan datos DP2 → rotular DP2.
- "DP2 Car Count %" en el Excel apunta al % de DP2 del bloque general (correcto en valor); calcularlo directo.
- "Breakfast Labor vs Guide %" en el Excel divide por una celda incorrecta → usar `/ hr_guide_dp1`.

## Validación
- Crea un script `backend/scripts/compare.ts` que, para un día y una tienda, imprima todos los KPIs para compararlos
  con el Excel. Datos de referencia (26/09/2026, total A01- AETOS Bahamas): Gross Sales 99,352.82; Net Sales 79,569.51;
  Sales DP1 4,556.84; DP2 20,273.68; DP3 15,332.29; DP4 22,398.85; DP5 12,453.09.

## Orden de trabajo
1. Backend: cliente ORDS con paginación + caché + tipos.
2. Módulo de agregación y KPIs + tests.
3. Endpoints.
4. Frontend: layout, filtros, BSC principal.
5. Resto de pantallas.
6. Login, Docker Compose, README con instrucciones de despliegue en Proxmox.
Pregúntame antes de decisiones grandes que no estén aquí.
