-- =====================================================================
-- ERP Report Studio — database schema
--
-- Two groups of tables live here:
--   1. APPLICATION tables (app_users, data_sources, reports, ...) — the
--      backend's own storage for the product itself.
--   2. DEMO ERP tables (erp_*) — a small stand-in "customer ERP database"
--      so the whole product can be run and tested end-to-end without a
--      real customer database. In production you point a data source at
--      the customer's real SQL Server / Postgres / MySQL instance instead
--      (see src/services/datasourceDrivers.ts) and re-map the three views
--      at the bottom of this file to that server's tables.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. APPLICATION TABLES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('Administrator', 'Report Designer', 'Report Viewer')),
  department     TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Invited', 'Disabled')),
  last_active    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_sources (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  database_type        TEXT NOT NULL DEFAULT 'SQL Server',
  server               TEXT NOT NULL,
  port                 TEXT NOT NULL DEFAULT '1433',
  database_name        TEXT NOT NULL,
  auth_method          TEXT NOT NULL CHECK (auth_method IN ('Windows Authentication', 'Database Authentication')),
  username             TEXT,
  -- AES-256-GCM encrypted JSON blob { password } — never returned to the client.
  encrypted_credentials TEXT,
  status               TEXT NOT NULL DEFAULT 'Disconnected' CHECK (status IN ('Connected', 'Disconnected', 'Error', 'Testing')),
  is_primary           BOOLEAN NOT NULL DEFAULT false,
  last_schema_refresh  TIMESTAMPTZ,
  last_data_refresh    TIMESTAMPTZ,
  created_by           UUID REFERENCES app_users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL DEFAULT '',
  owner          TEXT NOT NULL,
  visibility     TEXT NOT NULL DEFAULT 'Private' CHECK (visibility IN ('Private', 'Shared with Department', 'Shared with Company')),
  type           TEXT NOT NULL DEFAULT 'Custom Report' CHECK (type IN ('Fixed Template', 'Custom Report')),
  template_id    TEXT,
  dataset        TEXT NOT NULL,
  -- Full ReportDefinition (columns, filters, sort, calculated fields, formatting…) as JSON.
  -- Columns that are useful to filter/sort on in SQL are also promoted above as real columns.
  definition     JSONB NOT NULL,
  created_by     UUID REFERENCES app_users(id),
  last_modified  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run       TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  report_id  TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, report_id)
);

CREATE TABLE IF NOT EXISTS recently_viewed (
  user_id    UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  report_id  TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, report_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  user_name    TEXT NOT NULL,
  action       TEXT NOT NULL,
  report       TEXT,
  data_source  TEXT,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     TEXT REFERENCES reports(id) ON DELETE CASCADE,
  report_name   TEXT NOT NULL,
  frequency     TEXT NOT NULL CHECK (frequency IN ('Daily', 'Weekly', 'Monthly')),
  time          TEXT NOT NULL,
  recipients    TEXT[] NOT NULL DEFAULT '{}',
  format        TEXT NOT NULL CHECK (format IN ('Excel', 'PDF', 'CSV')),
  next_run      TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_owner ON reports(owner);
CREATE INDEX IF NOT EXISTS idx_reports_visibility ON reports(visibility);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);

-- ---------------------------------------------------------------------
-- 2. DEMO ERP TABLES  (stand-in customer database, "PolydimeERP")
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS erp_customers (
  customer_id   SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  address       TEXT,
  city          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  credit_limit  NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS erp_departments (
  department_id   SERIAL PRIMARY KEY,
  department_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS erp_employees (
  employee_id   SERIAL PRIMARY KEY,
  employee_name TEXT NOT NULL,
  department_id INTEGER REFERENCES erp_departments(department_id),
  rep_code      TEXT,
  territory     TEXT
);

CREATE TABLE IF NOT EXISTS erp_items (
  item_id    SERIAL PRIMARY KEY,
  item_name  TEXT NOT NULL,
  category   TEXT NOT NULL,
  unit_price NUMERIC(14,2) NOT NULL,
  uom        TEXT NOT NULL DEFAULT 'EA'
);

CREATE TABLE IF NOT EXISTS erp_invoices (
  invoice_id      SERIAL PRIMARY KEY,
  invoice_number  TEXT NOT NULL,
  invoice_date    DATE NOT NULL,
  customer_id     INTEGER NOT NULL REFERENCES erp_customers(customer_id),
  sales_rep_id    INTEGER REFERENCES erp_employees(employee_id),
  terms           TEXT NOT NULL,
  due_date        DATE NOT NULL,
  total_amount    NUMERIC(14,2) NOT NULL,
  open_balance    NUMERIC(14,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'Open',
  po_number       TEXT,
  memo            TEXT,
  type            TEXT NOT NULL DEFAULT 'Invoice',
  paid_status     TEXT NOT NULL DEFAULT 'No'
);

CREATE TABLE IF NOT EXISTS erp_invoice_lines (
  invoice_line_id SERIAL PRIMARY KEY,
  invoice_id      INTEGER NOT NULL REFERENCES erp_invoices(invoice_id) ON DELETE CASCADE,
  item_id         INTEGER NOT NULL REFERENCES erp_items(item_id),
  quantity        NUMERIC(14,2) NOT NULL,
  sales_price     NUMERIC(14,2) NOT NULL,
  amount          NUMERIC(14,2) NOT NULL,
  line_memo       TEXT
);

CREATE TABLE IF NOT EXISTS erp_payments (
  payment_id       SERIAL PRIMARY KEY,
  invoice_id       INTEGER REFERENCES erp_invoices(invoice_id),
  customer_id      INTEGER NOT NULL REFERENCES erp_customers(customer_id),
  payment_date     DATE,
  payment_amount   NUMERIC(14,2) NOT NULL,
  payment_method   TEXT NOT NULL DEFAULT 'Bank Transfer',
  reference        TEXT,
  avg_days_to_pay  NUMERIC(6,1)
);

CREATE INDEX IF NOT EXISTS idx_erp_invoices_customer ON erp_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_erp_invoice_lines_invoice ON erp_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_erp_payments_customer ON erp_payments(customer_id);

-- ---------------------------------------------------------------------
-- 3. REPORT-ENGINE VIEWS
--
-- These flatten the relational ERP tables into the three column shapes
-- the frontend already knows how to render (see src/schema/metadata.ts
-- for the whitelist of columns exposed from each). Report definitions
-- reference a "dataset" (salesLines | paymentTxns | openInvoices) and
-- the query engine SELECTs from the matching view below.
-- ---------------------------------------------------------------------

CREATE OR REPLACE VIEW v_sales_lines AS
SELECT
  il.invoice_line_id                      AS "lineId",
  i.invoice_id                            AS "invoiceId",
  c.customer_id                           AS "customerId",
  i.invoice_date                          AS "date",
  i.invoice_number                        AS "num",
  c.customer_name                         AS "name",
  i.terms                                 AS "terms",
  i.due_date                              AS "dueDate",
  it.item_name                            AS "item",
  it.category                             AS "category",
  i.paid_status                           AS "paid",
  il.quantity                             AS "qty",
  il.sales_price                          AS "salesPrice",
  il.amount                               AS "amount",
  e.rep_code                              AS "rep",
  e.employee_name                         AS "repName",
  d.department_name                       AS "department",
  i.status                                AS "status",
  c.city                                  AS "city",
  i.po_number                             AS "po",
  it.uom                                  AS "uom",
  it.item_id                              AS "itemId",
  e.employee_id                           AS "repId",
  c.email                                 AS "email",
  c.credit_limit                          AS "creditLimit",
  i.memo                                  AS "memo"
FROM erp_invoice_lines il
JOIN erp_invoices  i  ON i.invoice_id = il.invoice_id
JOIN erp_customers c  ON c.customer_id = i.customer_id
JOIN erp_items     it ON it.item_id = il.item_id
LEFT JOIN erp_employees  e ON e.employee_id = i.sales_rep_id
LEFT JOIN erp_departments d ON d.department_id = e.department_id;

CREATE OR REPLACE VIEW v_payment_txns AS
SELECT
  p.payment_id                            AS "paymentId",
  i.invoice_id                            AS "invoiceId",
  i.invoice_date                          AS "date",
  i.invoice_number                        AS "num",
  i.paid_status                           AS "paid",
  i.total_amount                          AS "amount",
  c.customer_name                         AS "name",
  i.terms                                 AS "terms",
  i.due_date                              AS "dueDate",
  p.payment_date                          AS "paidDate",
  p.avg_days_to_pay                       AS "avgDaysToPay",
  p.payment_amount                        AS "paidAmount",
  p.payment_method                        AS "paymentMethod",
  e.rep_code                              AS "rep",
  e.employee_name                         AS "repName",
  i.status                                AS "status",
  c.customer_id                           AS "customerId"
FROM erp_payments p
JOIN erp_customers c ON c.customer_id = p.customer_id
LEFT JOIN erp_invoices i ON i.invoice_id = p.invoice_id
LEFT JOIN erp_employees e ON e.employee_id = i.sales_rep_id;

CREATE OR REPLACE VIEW v_open_invoices AS
SELECT
  i.type                                  AS "type",
  i.invoice_date                          AS "date",
  i.invoice_number                        AS "num",
  i.po_number                             AS "po",
  i.terms                                 AS "terms",
  GREATEST(0, (CURRENT_DATE - i.due_date))::INT AS "aging",
  i.open_balance                          AS "openBalance",
  i.total_amount                          AS "amount",
  c.customer_name                         AS "name",
  i.due_date                              AS "dueDate",
  e.rep_code                              AS "rep",
  e.employee_name                         AS "repName",
  i.status                                AS "status",
  c.customer_id                           AS "customerId",
  i.invoice_id                            AS "invoiceId",
  c.city                                  AS "city"
FROM erp_invoices i
JOIN erp_customers c ON c.customer_id = i.customer_id
LEFT JOIN erp_employees e ON e.employee_id = i.sales_rep_id
WHERE i.status = 'Open';
