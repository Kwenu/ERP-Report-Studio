# ERP Report Studio — Backend

A real, working backend for the ERP Report Studio frontend you already built. It replaces the
frontend's simulated `src/services/erpApi.ts` with genuine HTTP APIs backed by PostgreSQL:
authentication, data-source management with a **real** connection test, schema metadata,
a parameterized SQL report-query engine, saved reports, users, audit log, and schedules.

```
ERP Report Studio (React frontend)
      ↓  HTTPS + bearer token
Secure Backend / API   (this project — Node + Express + TypeScript)
      ↓
Database Connector  →  Schema / Metadata Service
      ↓
Report Query Engine  (whitelisted, parameterized SQL — see src/services/queryBuilder.ts)
      ↓
PostgreSQL  (bundled demo ERP tables today; point it at the real customer ERP later)
```

No connection string, username or password is ever sent back to the browser. Data-source
credentials are encrypted at rest (AES-256-GCM) and only decrypted server-side when the
backend needs to connect out to a database.

---

## 1. What's included

| Area | Endpoints | Notes |
|---|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` | JWT, bcrypt password hashes, 3 roles |
| Data sources | `GET/POST/PUT/DELETE /datasources`, `POST /datasources/:id/test`, `POST /datasources/:id/schema/refresh`, `POST /datasources/:id/data/refresh` | Real TCP + Postgres connection test |
| Schema | `GET /schema/tables`, `/fields`, `/relationships`, `/datasets` | Tables/fields catalogue the UI's Data Model pages expect |
| Reports | `GET/POST/DELETE /reports`, `POST /reports/:id/duplicate`, `POST /reports/:id/favorite`, **`POST /reports/query`** | The query engine — turns a report definition into real SQL |
| Users | `GET/POST/PUT/DELETE /users` | Admin-only writes |
| Audit | `GET /audit` | |
| Schedules | `GET/POST /schedules`, `PUT /schedules/:id/toggle`, `DELETE /schedules/:id` | |

Everything lives under `API_BASE = /api/v1`.

### The report query engine, briefly

`src/services/queryBuilder.ts` takes a report's dataset + columns + filters + sort + group-by
and builds a parameterized SQL query. It is intentionally strict:

- `dataset` must be one of the three whitelisted datasets in `src/schema/metadata.ts`
  (`salesLines`, `paymentTxns`, `openInvoices`), each backed by a real SQL view.
- Every column/filter/sort key must exist in that dataset's whitelist — anything else is
  rejected with `400 Bad Request` **before** a query is built.
- All filter/sort **values** are bound as query parameters (`$1`, `$2`, …), never concatenated
  into the SQL string. Column/table identifiers are also taken only from the whitelist, so
  there's no path for user input to reach an arbitrary table, column, or raw SQL fragment.

This was unit-tested directly against attempted SQL-injection-style column names and confirmed
to reject them (`Column "DROP TABLE users;--" is not reportable on dataset "salesLines"`).

### The bundled demo ERP database

To make this testable end-to-end today — before you've connected your customer's real
database — `db/schema.sql` also creates a small stand-in ERP schema (`erp_customers`,
`erp_invoices`, `erp_invoice_lines`, `erp_payments`, `erp_items`, `erp_employees`) and three
views (`v_sales_lines`, `v_payment_txns`, `v_open_invoices`) that flatten them into exactly the
column shapes your frontend's mock data used. `npm run seed` fills these with realistic
synthetic data (customers, invoices, payments, ~220 invoices). Section 5 below explains how to
repoint this at the customer's actual ERP instead.

---

## 2. Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (via Docker, or a local/managed instance you already have)
- Docker + Docker Compose (optional, easiest way to get Postgres running)

---

## 3. Setup

```bash
cd backend
npm install

cp .env.example .env
```

Generate a real encryption key and put it in `.env` as `CREDENTIALS_ENC_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Also set `JWT_SECRET` in `.env` to another long random string, and set `CORS_ORIGIN` to your
frontend's dev URL (defaults to `http://localhost:5173`, Vite's default).

Start Postgres:

```bash
docker compose up -d
```

(No Docker? Point `DATABASE_URL` in `.env` at any Postgres 14+ instance you have instead —
`postgresql://user:password@host:5432/dbname`. It just needs to exist; the next step creates
the tables.)

Create the schema, then seed demo data:

```bash
npm run db:init
npm run seed
```

`npm run seed` prints the login credentials it creates, e.g.:

```
Users: admin <chamila.perera@polydime.lk> / password "Passw0rd!"
```

(Also creates a Report Designer and a Report Viewer account — see `src/db/seed.ts` for exact
emails/passwords, or override `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env` before seeding.)

Start the API:

```bash
npm run dev
```

You should see:

```
✅ ERP Report Studio backend listening on http://localhost:4000
   API base: http://localhost:4000/api/v1
```

`GET http://localhost:4000/health` is a plain liveness check with no auth required.

---

## 4. Testing it works (curl)

**Log in** and grab a token:

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chamila.perera@polydime.lk","password":"Passw0rd!"}'
```

Save the returned `token` into a shell variable for the rest of these:

```bash
TOKEN="paste-the-token-here"
```

**Fetch the ERP schema** (tables/fields the Data Model pages would show):

```bash
curl -s http://localhost:4000/api/v1/schema/tables -H "Authorization: Bearer $TOKEN" | head -c 500
```

**Run a real report query** against the seeded demo data — sales grouped by customer, filtered
to paid invoices, summed:

```bash
curl -s -X POST http://localhost:4000/api/v1/reports/query \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
        "dataset": "salesLines",
        "columns": [{"key":"name"}, {"key":"amount","aggregation":"sum"}],
        "filters": [{"key":"paid","operator":"equals","value":"Yes"}],
        "groupBy": "name",
        "sort": [{"key":"name","dir":"asc"}]
      }'
```

You should get back real rows summed from the demo Postgres data, e.g. one row per customer
with a `name` and a summed `amount`, plus `records`, `executionMs`, `completedAt`.

**List saved reports:**

```bash
curl -s http://localhost:4000/api/v1/reports -H "Authorization: Bearer $TOKEN"
```

**Add and test a data source** (pointing at your own Postgres as a stand-in for "the ERP"; swap
in real SQL Server details once you're ready — see Section 5):

```bash
curl -s -X POST http://localhost:4000/api/v1/datasources \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
        "name": "PolydimeERP",
        "databaseType": "PostgreSQL",
        "server": "localhost",
        "port": "5432",
        "database": "erp_report_studio",
        "authMethod": "Database Authentication",
        "username": "erp_app",
        "password": "erp_app_password"
      }'
```

Copy the returned `id`, then:

```bash
curl -s -X POST http://localhost:4000/api/v1/datasources/<id>/test \
  -H "Authorization: Bearer $TOKEN"
```

This runs a **real** TCP + Postgres auth/schema check (not a simulated timer) and returns
step-by-step results.

If you'd rather click through requests than type curl, import the routes above into Postman or
Insomnia — every route above is also listed in the table in Section 1.

---

## 5. Connecting the real frontend

The frontend's `src/services/erpApi.ts` currently only *simulates* a backend (see the comment
block at the top of that file). To wire it up for real:

1. Copy the files from `frontend-integration/` into your frontend project:

   | From | To |
   |---|---|
   | `frontend-integration/http.ts` | `src/services/http.ts` |
   | `frontend-integration/authApi.ts` | `src/services/authApi.ts` |
   | `frontend-integration/erpApi.ts` | `src/services/erpApi.ts` (**overwrites** the simulated one) |
   | `frontend-integration/reportsApi.ts` | `src/services/reportsApi.ts` |

2. Add to the frontend's `.env` (create one if it doesn't exist, Vite reads `VITE_*` vars):

   ```
   VITE_API_BASE_URL=http://localhost:4000/api/v1
   ```

3. **Wire up login.** `Login.tsx` currently calls `signIn(role)` with no real credentials
   check. Change its submit handler to call the new `login()`:

   ```tsx
   import { login } from '../services/authApi';
   // ...
   onSubmit={async (e) => {
     e.preventDefault();
     const user = await login(email, password);
     signIn(user.role); // keep using AppContext's existing signIn for now
   }}
   ```

4. **`runQuery`, `testConnection`, `refreshSchema`, `refreshData`** in the new `erpApi.ts` keep
   the same exported names and very similar signatures to the simulated versions, so
   `ReportWorkspace.tsx`, `TestConnectionDialog.tsx`, `RefreshSchemaDialog.tsx`, and
   `DataRefreshDialog.tsx` need only small call-site updates — `testConnection`, `refreshSchema`,
   and `refreshData` now take a `dataSourceId` as their first argument (a saved data source in
   the backend, not just a form's in-progress values), since the backend needs to know which
   row's credentials to use.

5. **Wiring persistence for saved reports/favorites/audit** (optional, incremental): `AppContext.tsx`
   currently keeps `savedReports`, `favorites`, and `audit` in React state seeded from
   `src/data/adminData.ts`. `reportsApi.ts` gives you `listReports`, `saveReport`,
   `deleteReport`, `duplicateReport`, `setFavorite`, and `fetchAuditLog` to replace that
   in-memory state with real API calls — e.g. call `listReports()` in a `useEffect` on mount and
   `setSavedReports(result.reports)` instead of seeding from `seedCustomReports`. This can be
   done one function at a time without breaking the rest of the app, since the shapes match
   `ReportDefinition` already.

6. Start both projects and click through: **Login → Data Sources → Add/Test connection →
   Report Builder → Run** should now be hitting the real API end-to-end, and the rows you see
   in the report table are genuinely coming out of Postgres via the SQL the query engine built.

---

## 6. Connecting to the customer's real ERP database

The bundled `erp_*` tables and views are a stand-in so you can develop and demo without the
customer's database. To point at their real SQL Server (or MySQL/Oracle) instance instead:

1. **Add a driver.** `src/services/datasourceDrivers.ts` currently has a real, working branch
   only for PostgreSQL (kept dependency-light on purpose). For SQL Server:

   ```bash
   npm install mssql @types/mssql
   ```

   Then add a branch in `testDatasourceConnection()` alongside the existing PostgreSQL one,
   using `mssql`'s `ConnectionPool` the same way the Postgres branch uses `pg`'s `Client`.

2. **Point the report views at the real tables.** The query engine only ever selects from the
   three views defined at the bottom of `db/schema.sql` (`v_sales_lines`, `v_payment_txns`,
   `v_open_invoices`). Two ways to connect them to the customer's actual ERP:

   - **Live query (simplest for a first cut):** if the customer's database is reachable from
     this backend, `CREATE VIEW` (or, for cross-database access, a foreign data wrapper /
     linked server) pointing the same column aliases at their real tables instead of `erp_*`.
   - **ETL / replication (recommended for production):** have `POST /datasources/:id/data/refresh`
     actually pull rows from the customer's ERP into the local `erp_*` tables (via `mssql`
     queries → `INSERT`/`UPSERT` into Postgres) on a schedule, so reports run fast against a
     local copy rather than hitting the live ERP for every report. This matches the "Data
     Refresh" concept the frontend already has a page for (`DataRefresh.tsx`).

3. **Update `src/schema/metadata.ts`** if the customer's real table/column names differ from
   the demo schema (they will) — this is also the file to edit if they have additional tables
   /fields you want reportable that aren't in the current three datasets.

4. Everything else (auth, the query engine's SQL generation and injection protection, the
   REST API surface) stays the same regardless of which real database sits behind it.

---

## 7. Security notes

- Passwords are hashed with bcrypt; data-source credentials are encrypted at rest with
  AES-256-GCM and never returned to the client (`toPublic()` in `datasources.routes.ts` strips
  `encrypted_credentials` from every response).
- All report SQL is generated from an explicit whitelist (`src/schema/metadata.ts`) with bound
  parameters — see `src/services/queryBuilder.ts`. Do not add a "raw SQL" escape hatch to this
  engine; if you need a new reportable field, add it to the whitelist and the matching SQL view
  instead.
- Set a real `JWT_SECRET` and `CREDENTIALS_ENC_KEY` before deploying anywhere beyond your own
  machine — the `.env.example` placeholders are not safe to use as-is.
- `CORS_ORIGIN` in `.env` should be locked down to your actual frontend origin(s) in production.

---

## 8. Project layout

```
backend/
  db/schema.sql              # app tables + demo ERP tables + report views
  src/
    config/env.ts            # env var loading/validation
    db/pool.ts                # Postgres pool
    db/init.ts, seed.ts       # schema + seed scripts
    schema/metadata.ts        # table/field/dataset whitelist (see Section 1)
    services/
      queryBuilder.ts         # report definition → parameterized SQL
      datasourceDrivers.ts    # real connection testing
      audit.ts
    middleware/auth.ts, errorHandler.ts
    routes/                   # one file per resource
    app.ts, server.ts
  frontend-integration/       # drop-in files for the React app (Section 5)
```
