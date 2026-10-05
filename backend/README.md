# ERP Report Studio — Backend

```
React frontend  ──HTTPS + JWT──▶  this API (Node/Express/TypeScript)
                                      ├─ App database (PostgreSQL): users, saved reports, audit, data-source registry
                                      └─ ERP database (SQL Server, read-only login) ◀── report queries (whitelisted, parameterised SQL)
```

Two databases are involved:
1. **App database (PostgreSQL)** – the tool's own storage. Started with `docker compose up -d`.
2. **Your ERP database (SQL Server)** – only ever read, through three SQL views (`db/erp_views.mssql.sql`).

## Setup (first time)

```bash
cd backend
npm install
cp .env.example .env          # then edit it (see below)
docker compose up -d          # app Postgres
npm run db:init               # creates app tables
npm run seed                  # creates login users (prints them)
```

Edit `.env`:
- `JWT_SECRET` – long random string
- `CREDENTIALS_ENC_KEY` – `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ERP_DB_*` – your SQL Server host / database / **read-only SQL login**

## Connect to the ERP

```bash
npm run erp:connect     # stores the ERP as the primary data source (password encrypted) and tests it
npm run erp:inspect     # writes erp-schema.txt: every real table/column/key in your ERP
```

Then open `db/erp_views.mssql.sql`, change table/column names to match `erp-schema.txt`,
and run it in SSMS on the ERP database. Finally:

```bash
npm run typecheck
npm run dev             # http://localhost:4000   (health: /health)
```

Frontend: `frontend/.env` → `VITE_API_BASE_URL=http://localhost:4000/api/v1`, then `npm run dev`.

## How reports run
`POST /api/v1/reports/query` → `queryBuilder.ts` validates every column against `src/schema/metadata.ts`
(whitelist), builds parameterised T-SQL (`@p1…`, `OFFSET/FETCH`) and runs it on the primary data source.
No user input is concatenated into SQL. If a view/column is missing you get a clear `502` with the SQL Server message.

## Notes
- **Windows Authentication is not supported** by the Node driver – use a SQL login.
- Until a primary data source exists, reports run on the bundled demo data (response field `source` tells you which).
- Named instances: `ERP_DB_SERVER=HOST\INSTANCE` (port ignored).
- Azure SQL: `ERP_DB_ENCRYPT=true`.
- API: `/auth`, `/datasources` (+`/:id/test`, `/schema/refresh`, `/data/refresh`), `/schema/*`, `/reports` (+`/query`), `/users`, `/audit`, `/schedules`.
