# Daily BSC (Balanced Scorecard) — Popeyes AETOS Bahamas

Reemplazo web del reporte Excel "Daily_BSC". Ver especificación completa en [`docs/spec-bsc.md`](docs/spec-bsc.md).

## Estructura

- `backend/` — Node 20 + TypeScript + Express. Consume ORDS (Oracle REST), agrega y calcula KPIs, expone la API.
- `frontend/` — React + Vite + TypeScript + Tailwind. Consume solo la API del backend.
- `docker-compose.yml` — build y despliegue de ambos servicios.

## Desarrollo local

### Backend

```bash
cd backend
cp .env.example .env   # completar ORDS_URL, ORDS_AUTH/ORDS_USER/ORDS_PASSWORD, JWT_SECRET
npm install
npm run test            # vitest
npm run dev              # http://localhost:3001
```

Crear el primer usuario de login:

```bash
cp backend/src/auth/users.example.json backend/src/auth/users.json
npx tsx backend/scripts/hashPassword.ts "<contraseña>"
# pegar el hash resultante en backend/src/auth/users.json
```

Sin acceso a ORDS real, se puede levantar con datos de prueba agregando `ORDS_MODE=mock` en `backend/.env`
(genera un dataset sintético de 24 tiendas / 7 días, solo para desarrollo — nunca usar en producción).

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173, con proxy /api -> localhost:3001
```

## Despliegue con Coolify (Proxmox)

Este proyecto se despliega como un recurso **Docker Compose** en Coolify, a partir de este repositorio Git.

### 1. Subir el repo

```bash
git remote add origin <url-de-tu-repo-git>
git push -u origin main
```

(Puede ser GitHub, GitLab, o un servidor Gitea propio — lo que tengas conectado a Coolify.)

### 2. Crear el recurso en Coolify

1. En Coolify: **New Resource → Docker Compose** (o "Application" apuntando al repo con Compose).
2. Conecta el repositorio Git del paso anterior y la rama a desplegar (`main`).
3. Coolify detecta `docker-compose.yml` en la raíz automáticamente.
4. En **Environment Variables** del servicio `backend`, define (esto reemplaza a `backend/.env`, que nunca se
   sube al repo):
   - `ORDS_URL` — URL real de la vista ORDS.
   - `ORDS_AUTH=basic`
   - `ORDS_USER`, `ORDS_PASSWORD` — credenciales reales de ORDS.
   - `CACHE_TTL_MIN` — por defecto `10`.
   - `PORT=3001`
   - `JWT_SECRET` — **generar uno nuevo y fuerte para producción**, distinto del valor de desarrollo
     (`openssl rand -hex 32`).
   - `NODE_ENV=production`
   - No definir `ORDS_MODE` en producción (solo se usa en desarrollo local).
5. El archivo `backend/src/auth/users.json` (usuarios y hashes bcrypt) no va en el repo ni en variables de
   entorno — es un volumen montado (ver `docker-compose.yml`). Súbelo al servidor por fuera de Coolify (SCP/SFTP
   a la ruta que Coolify usa para el checkout del repo, dentro de `backend/src/auth/users.json`) antes del
   primer deploy, o usa la función de "Persistent Storage / File" de Coolify para montarlo si la interfaz lo
   permite en tu versión.
6. Publica el dominio del servicio `frontend` (puerto interno `80`) en la sección de dominios/proxy de Coolify
   — Coolify se encarga del certificado TLS (Let's Encrypt) automáticamente si le das un dominio real.

### 3. Deploy

Botón **Deploy** en Coolify. Cada push a la rama configurada puede disparar un redeploy automático si activas
el webhook (Coolify lo ofrece al crear el recurso).

### Actualizar después de un cambio

```bash
git add .
git commit -m "..."
git push
```

Y luego "Deploy" en Coolify (o automático si el webhook está activo).

### Notas de seguridad

- `backend/.env` y `backend/src/auth/users.json` nunca se commitean (están en `.gitignore`).
- El frontend nunca llama a ORDS directamente, solo al backend, vía `/api/*` (proxy de nginx dentro del
  contenedor `frontend`, definido en `frontend/nginx.conf`).
- El JWT vive en una cookie `httpOnly`; usa siempre HTTPS en producción (Coolify + Let's Encrypt lo resuelve).

## Anomalías del Excel original — versión corregida (no replicada)

Ver sección "Anomalías del Excel original" de [`docs/spec-bsc.md`](docs/spec-bsc.md). Implementadas y
cubiertas con test en `backend/src/kpis.test.ts`:

- DP2: filas de Service Time y Car Count correctamente etiquetadas y calculadas como DP2 (no "DP1").
- "DP2 Car Count %" calculado directo (`car_count_dp2 / Car Count`).
- "Breakfast Labor vs Guide %" divide por `hr_guide_dp1` (no la celda incorrecta del Excel original).

## Validación de KPIs

`backend/scripts/compare.ts` corre el pipeline de agregación/KPIs contra un fixture sintético calibrado para
reproducir exactamente los valores de referencia de la spec (día 26/09/2026, área "A01- AETOS Bahamas"). Sirve
para verificar que la lógica de cálculo es correcta de forma aislada, no la integración real con ORDS:

```bash
cd backend
npx tsx scripts/compare.ts
```
