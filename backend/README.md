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

## Inventory Quick Report

The **Inventory Quick Report** (Reports menu, directly below *Manufacturing Quick Report*) lists the stock, purchasing and
sales transactions of `Inventory_Quick_Report_1.xlsx` - Purchase Order, GRN, FOC In Entry, GRN Return, Quotation, Sales Order,
Invoice, Dispatch, Inv Return, Issue, Issue Return, Transfer, Damage Transfer, Inter Location Transfer, Adjustments,
Issue / Acceptance Notes, Floor Adjustments, Site Transfer Entry-SF, Un Used Product In Entry, Un Used Dispatch.

It works exactly like the Manufacturing Quick Report: a SQL Server view generated from the ERP's header + detail tables.

```
cd backend
npm run erp:inv-view              # writes db/erp_views.inventory.generated.sql + erp-inv-view-report.txt + erp-inv-txn-codes.txt
npm run erp:inv-view -- --apply   # ...and creates / replaces dbo.v_inventory_quick right away (needs a login that can CREATE VIEW)
```

Then press **Refresh** in the report. Notes:

* `erp-inv-view-report.txt` shows, per transaction, which header / detail column feeds each report column. A line starting
  with `!` means a table or column was not found - fix it in `INV_OVERRIDES` (`src/services/invViewBuilder.ts`) and run the command again.
* Columns: Type, Reference No, Date, Manual No, Item code, Name, Machine, Quantity, From (Company, Site, Location, Bin Location),
  To (Company, Site, Location, Bin Location), Cost Centre. *Quantity* is the detail line's Qty (Purchase Order: AloQty when it exists).
* Transfer, Damage Transfer, Inter Location Transfer and Site Transfer Entry-SF fill both sides (header columns FSiteCode / TSiteCode,
  FLocCode / TLocCode ...). Every other document has one place: shown under *To* for documents that bring stock in (PO, GRN,
  Inv Return, Issue Return / Acceptance notes) and under *From* for the rest - change `side` per table in `INV_SOURCES` if needed.
* Transactions that share one header table (GRN + FOC In Entry on `fGrnHed`, the four adjustments on `fAdjHed`, the Dispatch
  variants on `fDispHed` ...) are told apart by their Txn Type code. The command finds the codes itself when the ERP has a
  transaction-type table; otherwise add them in `INV_TXN_NAMES`, e.g. `['fGrnHed', 'FOC In Entry', 'FOC']` (the codes found in
  the database are listed in `erp-inv-txn-codes.txt`).
* The **Type** drop-down in the report filters by transaction (e.g. only GRN). It is applied in the database, so it stays complete
  for periods with more than 20,000 rows. The Configure panel's filter builder and *Group by* work on every column as well.
