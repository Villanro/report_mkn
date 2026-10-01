# Documentación de implementación — Daily BSC (Popeyes AETOS Bahamas)

Este documento registra **qué se construyó, cómo, y por qué**, incluyendo los problemas reales encontrados
durante el desarrollo y el despliegue. La especificación funcional original (qué debe hacer la app) está en
[`docs/spec-bsc.md`](spec-bsc.md) — este documento es el complemento de "cómo quedó implementado".

Última actualización: 2026-10-01.

## 1. Resumen

Web que reemplaza el Excel "Daily_BSC": consume datos de Oracle ORDS, calcula los mismos KPIs/colores que el
Excel, los muestra en 6 pantallas, y suma un asistente de chat con IA (Kimi K2.6) que responde preguntas en
lenguaje natural sobre el reporte.

**Stack**: Node 20 + TypeScript + Express (backend) · React + Vite + TypeScript + Tailwind (frontend) ·
Docker Compose · Coolify (despliegue) · Cloudflare Tunnel (acceso público).

**Repositorio**: `https://github.com/Villanro/report_mkn.git`, rama `main`.

**URL de producción**: `https://report.themkn.es`.

## 2. Backend (`backend/`)

### 2.1 Cliente ORDS (`src/ords/client.ts`, `src/ords/cache.ts`)

- Pagina siguiendo `links[rel=next]` de la respuesta de ORDS (`limit=500` por página), sin límite fijo de
  páginas.
- Normaliza valores `null` a `0` en los campos numéricos.
- Soporta **Basic Auth** real: si `ORDS_AUTH=basic` (con `ORDS_USER`/`ORDS_PASSWORD`), agrega el header
  `Authorization: Basic <base64>` a cada request. Sin esa variable, no manda auth (comportamiento original).
- Timeout de 45s por request vía `AbortController` — un fallo de red a ORDS ya no cuelga el proceso: se
  convierte en `OrdsUnavailableError` → el endpoint responde 502 `{"error":"ORDS unavailable"}` en vez de
  tumbar el servidor (bug real encontrado y corregido durante las pruebas con `frontend`).
- Caché en memoria con TTL (`CACHE_TTL_MIN`, default 10 min), invalidable vía `POST /api/refresh`.
- **Modo mock** (`ORDS_MODE=mock`, solo desarrollo): sirve un dataset sintético de 24 tiendas / 7 días
  (`src/ords/mockData.ts`) sin tocar `ORDS_URL`, para poder probar sin credenciales reales.

### 2.2 Tipo de fila (`src/types/ordsRow.ts`)

La vista real de ORDS trae ~255 columnas. El tipo `OrdsRow` declara explícitamente los campos usados por el
diccionario de KPIs de la spec (dimensiones + todos los numéricos de fórmulas), más un índice de firma abierto
(`[key: string]: ...`) para el resto. Verificado contra datos reales: **ningún campo numérico llega como
string ni viceversa** — el tipo es estructuralmente correcto. Columnas reales fuera del diccionario (no
usadas, capturadas por el índice): `infs_ebitda_*`, `pay_crew_*`/`pay_mngr_*`, `steton_*`, `corrdia_*`,
`syr2_*`, `quests_*`, entre otras — ninguna requerida por la spec actual.

### 2.3 Agregación y KPIs (`src/aggregate.ts`, `src/kpis.ts`, `src/kpiCatalog.ts`)

- Suma todos los campos numéricos **excepto** `syr_service_time`, `syr_sos_dp1..6`, `hr_labor_dp1..6`,
  `hr_guide_dp1..6`, `syr_upsize_pct`, que se promedian.
- Caso especial: **"Breakfast Labor $"** usa la SUMA de `hr_labor_dp1` (no el promedio) — `aggregateRows`
  expone tanto la suma como el promedio de los campos de promedio para que el cálculo de KPI elija cuál usar.
- Los KPIs (ratios) se recalculan **después** de agregar — nunca se promedia un porcentaje ya calculado día a
  día (regla verificada con un caso concreto: Labor $/NS de 2 días da 40.00% correcto vs. 37.50% si se
  hubieran promediado los dos % diarios).
- **Las 3 anomalías del Excel original, corregidas** (con test explícito que falla si se reintroduce el
  comportamiento viejo):
  1. DP2: filas de Service Time y Car Count correctamente rotuladas/calculadas como DP2 (no "DP1").
  2. "DP2 Car Count %" calculado directo (`car_count_dp2 / Car Count`).
  3. "Breakfast Labor vs Guide %" divide por `hr_guide_dp1` (no la celda incorrecta del Excel).
- `kpiDirection.ts`: tabla de dirección (`higherIsBetter`/`lowerIsBetter`) para los ~68 KPIs sin color propio
  del catálogo (los 22 con color usan esa regla de negocio para "peor/mejor"). Sin huecos, auditado contra las
  90 entradas del catálogo.

### 2.4 Jerarquías (`src/hierarchy.ts`)

`groupRowsByLevel` agrupa filas por división/área/distrito/tienda; `buildHierarchy` calcula las métricas de
cada grupo reusando `kpis.ts` (nunca reimplementa cálculo). Usado tanto por `/api/hierarchy` como por las
tools del chat.

### 2.5 Endpoints (`src/routes/`)

- `GET /api/days` — días disponibles (ordenados por fecha real embebida en `tie_bsc_descripcion`, no por el
  string crudo — fix real: con más de una semana de datos, ordenar por el string mezclaba "todos los día-1 de
  cada semana" antes que "todos los día-2").
- `GET /api/filters` — valores únicos por filtro, en cascada.
- `GET /api/bsc?day=&division=&...` — KPIs agregados + color. La semana se agrupa por el código de semana
  fiscal (prefijo de `tie_bsc_descripcion`, ej. `"26P09W4"`), no por rango de fecha Sun-Sat calculado — la
  semana fiscal real corre **lunes a domingo**, no domingo a sábado como dice el texto de la spec; agrupar por
  el código de Oracle evita ese problema de raíz.
- `GET /api/hierarchy?day=&level=&section=&...` — filas jerárquicas planas (el cliente arma el árbol).
- `POST /api/refresh` — invalida la caché de ORDS.
- `POST /api/login`, `POST /api/logout`, `GET /api/me` — auth JWT en cookie `httpOnly`.
- `POST /api/chat` — ver sección 4.

Todas las rutas `/api/*` (salvo login) requieren JWT vía `requireAuth`. Errores de ORDS se propagan como 502
controlado (`asyncHandler` + error handler central en `app.ts`), nunca tumban el proceso.

### 2.6 Autenticación (`src/auth/`)

Usuario/contraseña con bcrypt, JWT en cookie httpOnly. `backend/src/auth/users.json` (gitignored) — generar
usuarios con `npx tsx backend/scripts/hashPassword.ts <password>`.

### 2.7 Validación (`backend/scripts/compare.ts`)

Corre el pipeline real sobre un fixture sintético calibrado para reproducir exactamente los 7 valores de
referencia de la spec (día 26/09/2026, área "A01- AETOS Bahamas"). Sirve para validar la LÓGICA de cálculo,
no la integración con ORDS real. Resultado: **coincidencia exacta** en los 7 valores.

Contra **datos reales** de ORDS (semana 26P09W4, 7 días, 6 tiendas), 3 de 7 valores de referencia coincidieron
exacto y los otros 4 difirieron en ~0.05% — atribuido a que los datos en Oracle se actualizaron desde que se
escribió la spec, no a un bug (la jerarquía es internamente consistente: sumar las 6 tiendas a mano cuadra
exacto con el total).

**Nota pendiente de negocio** (no resuelta, decisión del usuario): los campos `smg_*` (OSAT/ZOD/Problem
Resolution) están en 0 en todos los datos reales actuales — probablemente no hay encuestas cargadas para esta
semana/tiendas. Existe un bloque alternativo `quests_*` también en 0, no investigado.

### 2.8 Tests

140 tests backend (Vitest) en verde: `aggregate.test.ts`, `kpis.test.ts` (incluye las 3 anomalías),
`colorThresholds.test.ts`, `targetTables.test.ts`, `kpiDirection.test.ts`, `date/week.test.ts`,
`ords/client.test.ts` (incluye Basic Auth).

## 3. Frontend (`frontend/`)

### 3.1 Pantallas

Las 6 de la spec + login: `/` (BSC principal), `/detail`, `/dp/1`, `/dp/2`, `/dp/6`, `/delivery`, `/sos`,
`/store/:id`, más `Login.tsx` (necesario porque todas las rutas de API exigen JWT).

- **BSC principal** y **Store Detail** comparten `BscTable.tsx`.
- **All Detail / DP1 / DP2 / DP6 / Delivery** comparten `HierarchySection.tsx` + `HierarchyTable.tsx` +
  `lib/hierarchyTree.ts` — el backend devuelve filas **planas** por nivel; el cliente arma el árbol pidiendo
  los 3 niveles en paralelo y combinando por las claves de división/área/distrito/tienda (sin
  recalcular/repromediar nada, usa las métricas ya agregadas de cada nivel).
- **SOS** es una tabla plana por nivel elegido (Área/DAO, Distrito/DM, Tienda).

### 3.2 Rediseño visual (ronda de `ui-ux`)

Motivado por feedback directo: "el diseño no es fácil de digerir". Cambios:
- **Agrupación temática** del Operations Scorecard en 7 secciones (Sales, Sales Trends, Deductions,
  Transactions, Labor, Service & Speed, Cash & Variance) en vez de una lista plana de ~55 filas.
- **Punto de estado por subárbol**: una fila de División/Área colapsada muestra el peor color
  (rojo>amarillo>verde) de TODOS sus descendientes, no solo de sus propias columnas visibles — mejora de
  mayor impacto para detectar problemas en jerarquías colapsadas o con scroll horizontal.
- Jerarquía tipográfica por nivel (no solo indentación), zebra striping, celdas con borde de acento de color,
  alineación decimal (`tabular-nums`), leyenda de colores.
- Fix de bug preexistente: header sticky roto por `border-collapse` (cambiado a `border-separate`).
- 4 bugs de formato corregidos: $ en KPIs que son conteos/horas, OSAT/ZOD/Problem Resolution ocultos cuando
  `value` es `undefined` pero `pct` existe, "Labor vs Guide" formateado como dinero en vez de horas, Delivery %
  faltante.

### 3.3 Utilidades

`lib/format.ts` ($ 2 decimales+miles, % 1 decimal, SOS en segundos, negativos entre paréntesis, conteos sin
símbolo), `lib/color.ts` (mapea el color YA resuelto por el backend a clases Tailwind — nunca calcula
umbrales), modo impresión (`@media print`).

## 4. Asistente de Chat (`backend/src/chat/`, `frontend/src/components/ChatWidget.tsx`)

### 4.1 Diseño

Widget flotante en las 8 pantallas. Regla de oro: el modelo **nunca** accede a ORDS ni a filas crudas — solo a
tools que envuelven la misma lógica interna que ya usan `/api/bsc`/`/api/hierarchy` (nunca reimplementada).

### 4.2 API / modelo (Moonshot/Kimi)

- Base URL confirmada en vivo: `https://api.moonshot.ai/v1` (no `.cn` — esa devolvía 401 con la key real).
- Modelo: `kimi-k2.6` (variante general, no las `-code`).
- `POST /api/chat`: `{ message, history? }` → streaming NDJSON: eventos `{"type":"status"|"token"|"sources"|"final"|"error", ...}`.

### 4.3 Tools

- Base: `list_days`, `list_kpis`, `list_filter_options`, `get_bsc`, `get_hierarchy` (envuelven exactamente lo
  que devuelven los endpoints homónimos).
- **Cómputo determinístico** (agregadas en una segunda ronda, para potencia/precisión/velocidad):
  - `rank_stores({kpi_key, day|days, direction, limit?, filters?})` — ordena tiendas por un KPI. Para rango de
    días, agrega los días ANTES de calcular (misma regla suma/promedio que el resto de la app). La dirección
    "mejor/peor" usa `colorThresholds` si el KPI tiene color, o `kpiDirection.ts` si no.
  - `get_trend({kpi_key, level, name, days?})` — serie compacta `{day,value,pct,color}[]` para una entidad.
    Resuelve el nombre por substring case-insensitive y explota con error claro si no encuentra o es ambiguo
    (bug real encontrado y corregido: un match exacto fallido devolvía silenciosamente una serie en 0,
    indistinguible de un dato real en 0).
  - `find_alerts({color, day|days, section?, filters?, limit?})` — escanea KPIs en rojo/amarillo a nivel
    compañía y por tienda, sin reimplementar umbrales.

### 4.4 Trazabilidad

Cada respuesta final viene acompañada de qué tools se usaron (`sources`), mostrado en el widget como "Ver
fuente" colapsado — para que el usuario pueda verificar que un número no salió de la nada.

### 4.5 Latencia

- Medido: ~99% del tiempo es razonamiento de Kimi, no las tools (que tardan 1-3ms con caché tibia).
- Tool calls dentro de una ronda se ejecutan en paralelo (`Promise.all`).
- `thinking: {type: "disabled"}` en las llamadas a Kimi — desde que las tools de cómputo hacen el trabajo
  analítico pesado, el modelo ya no necesita razonamiento extendido para elegir tool + redactar. Reducción de
  latencia real medida: ~35-55% (ej. "peor Service Time esta semana" bajó de 68-117s a 28.7s).
- Streaming real del texto de respuesta (`stream:true` a Kimi, reenviado como eventos `token`) — el usuario ve
  la respuesta aparecer palabra por palabra en vez de esperar el bloque completo.
- Timeouts: 90s por llamada a Kimi, 240s de presupuesto total del loop de tool-calling — antes de este fix,
  una pregunta pesada podía colgar indefinidamente sin ningún límite (bug real encontrado y corregido).

### 4.6 Seguridad del dato

`KIMI_API_KEY` solo vive en el backend (`.env` / variable de entorno de Coolify) — nunca llega al navegador.

## 5. Despliegue

### 5.1 Docker

- `backend/Dockerfile`, `frontend/Dockerfile` (multi-stage, alpine). `frontend` se sirve con nginx, que hace
  de proxy de `/api/*` hacia `backend:3001` (ver `frontend/nginx.conf`).
- `docker-compose.yml`: dos servicios, ambos con `expose` (no `ports` publicados) — es Coolify/Traefik quien
  expone al exterior, no un puerto fijo del host.

### 5.2 Coolify (self-hosted, Proxmox)

- Recurso tipo **Docker Compose**, origen "Public Repository" (el repo es público → no hace falta conectar
  GitHub App ni Personal Access Token).
- **Bug real encontrado en el primer deploy**: `docker-compose.yml` tenía `env_file: ./backend/.env`, pero ese
  archivo nunca existe en el host (gitignored) → `docker compose up` fallaba. Fix: se quitó esa línea; las
  variables se cargan en la pantalla "Environment Variables" de Coolify.
- **Bug real #2**: Coolify inyecta las env vars también en build-time por defecto. `NODE_ENV=production`
  como variable de build hace que `npm ci` salte las devDependencies (typescript, vite) → el build del
  frontend fallaba (`npm run build`, exit 127). Fix: marcar `NODE_ENV` como "Runtime only" (Build time =
  "Not available during build").
- **Bug real #3**: el volumen `./backend/src/auth/users.json:/app/dist/auth/users.json:ro` apunta a un
  archivo que tampoco existe en un clone fresco (gitignored) → Docker lo auto-crea como **directorio vacío**
  en el host, lo que rompe el login (lectura silenciosa de 0 usuarios) y además impide un `docker restart`
  simple después (el tipo bind directorio-vs-archivo queda fijado al crear el contenedor). Fix manual cada vez
  que se recrea el contenedor por primera vez tras un clone fresco:
  1. Verificar el path real del host con `docker inspect <contenedor> --format '{{json .Mounts}}'`
     (`/data/coolify/applications/<uuid>/backend/src/auth/users.json`).
  2. `rmdir` ese directorio vacío y reemplazarlo con el `users.json` real (JSON con usuario + hash bcrypt).
  3. Recrear el contenedor (`docker compose --project-name <uuid> up -d --force-recreate backend`) — un simple
     `docker restart` no sirve, hay que recrear.
  Esto hay que repetirlo cada vez que se hace un "Redeploy" completo desde cero (clone nuevo), no en
  actualizaciones incrementales si el volumen ya apunta a un archivo válido.
- Variables de entorno de producción cargadas vía "Developer View" (pegado estilo `.env`): `ORDS_URL`,
  `ORDS_AUTH`, `ORDS_USER`, `ORDS_PASSWORD`, `CACHE_TTL_MIN`, `PORT`, `JWT_SECRET` (nuevo, distinto del de
  desarrollo), `NODE_ENV=production`, `KIMI_API_KEY`. Sin `ORDS_MODE` (solo desarrollo).

### 5.3 Exposición pública — Cloudflare Tunnel

El servidor Coolify vive en una IP LAN (`192.168.1.21`), sin IP pública propia. Ya existía un Cloudflare
Tunnel (`coolify-tunnel`) exponiendo `panel.themkn.es` (el dashboard de Coolify). Se agregó una ruta nueva:

- **Dominio**: `report.themkn.es` (subdominio nuevo, CNAME a `panel.themkn.es` en Cloudflare DNS — hereda las
  IPs de borde de Cloudflare sin mantenimiento).
- **Ruta del túnel**: Subdomain `report`, Domain `themkn.es`, Service **Type: HTTP, URL: `192.168.1.21:80`**
  — apunta al proxy de Coolify (Traefik, escucha en `0.0.0.0:80`/`443` del host), NO a `localhost` (el
  contenedor de `cloudflared` no comparte namespace de red con el host, así que `localhost` ahí es el propio
  `cloudflared`, no el servidor).
- **Coolify → Domains** (app `report_mkn`, servicio `frontend`): Protocol `http`, Domain `report.themkn.es`,
  Port `80` (el puerto interno que expone el contenedor `frontend`). Traefik enruta por el header `Host` hacia
  el contenedor correcto — verificado con `curl -H "Host: report.themkn.es" http://localhost:80/` → `200`
  desde el propio servidor.
- Cloudflare termina el TLS público; el tramo túnel→Traefik es HTTP plano (red privada del túnel).

### 5.4 Checklist para un redeploy desde cero (clone nuevo)

1. Variables de entorno de producción ya deberían estar guardadas en Coolify (persisten entre deploys).
2. Deploy (Actions → Deploy).
3. Si el deploy es la PRIMERA vez (o se borró el volumen), rehacer el fix de `users.json` (sección 5.2,
   bug #3) — los redeploys posteriores sobre el mismo checkout no lo necesitan si el archivo ya quedó bien en
   el host.
4. Confirmar `curl -H "Host: report.themkn.es" http://localhost:80/` → 200 desde la terminal del host.

## 6. Decisiones pendientes / backlog conocido

- `smg_*` (OSAT/ZOD/Problem Resolution) en 0 en datos reales — no investigado si `quests_*` es el feed
  correcto (decisión del usuario: dejarlo así por ahora).
- Sin tests unitarios directos de `hierarchy.ts`/`tools.ts` del chat (cobertura hoy es indirecta vía otros
  tests) — sugerido por `validador`, no bloqueante.
- Restricción de usuarios por distrito/tienda (`districts`/`stores` en el modelo `User`) — campos preparados,
  no aplicados todavía en las rutas (mencionado como trabajo futuro en la spec original).
- `ORDS_MODE=mock` sigue disponible para desarrollo local (no usar nunca en producción).
