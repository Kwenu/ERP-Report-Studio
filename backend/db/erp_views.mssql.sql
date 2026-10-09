-- =====================================================================
-- ERP Report Studio — report views for SQL Server (run on the ERP database)
--
-- The report engine only ever SELECTs from these three views, and the
-- frontend expects exactly these column aliases. Each view flattens your
-- ERP tables into that shape.
--
-- !! The table / column names below follow the reference schema used by
-- !! the frontend (Customers, Invoices, InvoiceLines, Items, Payments,
-- !! SalesRepresentatives, Departments). Run `npm run erp:inspect`, compare
-- !! with erp-schema.txt, and edit the FROM / JOIN / column names to match
-- !! your real tables before running this script.
--
-- Run this with an account that may CREATE VIEW, then grant the reporting
-- login read-only access (see bottom of file).
-- =====================================================================

CREATE OR ALTER VIEW dbo.v_sales_lines AS
SELECT
  il.InvoiceLineID            AS lineId,
  i.InvoiceID                 AS invoiceId,
  c.CustomerID                AS customerId,
  i.InvoiceDate               AS [date],
  i.InvoiceNumber             AS num,
  CAST(NULL AS nvarchar(50))  AS manualNo,   -- map to your 'manual number' column
  CAST(NULL AS nvarchar(10))  AS currency,   -- map to the invoice currency code (empty = Rs.)
  CAST(NULL AS nvarchar(100)) AS company,    -- map to the company column
  c.CustomerName              AS name,
  i.Terms                     AS terms,
  i.DueDate                   AS dueDate,
  it.ItemName                 AS item,
  it.Category                 AS category,
  i.PaidStatus                AS paid,
  il.Quantity                 AS qty,
  il.SalesPrice               AS salesPrice,
  il.Amount                   AS amount,
  sr.RepCode                  AS rep,
  sr.RepName                  AS repName,
  d.DepartmentName            AS department,
  i.Status                    AS status,
  c.City                      AS city,
  i.PONumber                  AS po,
  it.UOM                      AS uom,
  it.ItemID                   AS itemId,
  sr.SalesRepID               AS repId,
  c.Email                     AS email,
  c.CreditLimit               AS creditLimit,
  il.LineMemo                 AS memo,
  CAST(NULL AS NVARCHAR(100)) AS other1,        -- map to any extra field you want in "Other 1"
  i.PONumber                  AS other2,
  c.Address                   AS address,
  c.Phone                     AS phone,
  sr.Territory                AS territory
FROM dbo.InvoiceLines il
JOIN dbo.Invoices i               ON i.InvoiceID = il.InvoiceID
JOIN dbo.Customers c              ON c.CustomerID = i.CustomerID
LEFT JOIN dbo.Items it            ON it.ItemID = il.ItemID
LEFT JOIN dbo.SalesRepresentatives sr ON sr.SalesRepID = i.SalesRepID
LEFT JOIN dbo.Departments d       ON d.DepartmentID = sr.DepartmentID
WHERE i.Status <> 'Void';
GO

CREATE OR ALTER VIEW dbo.v_payment_txns AS
SELECT
  p.PaymentID                 AS paymentId,
  i.InvoiceID                 AS invoiceId,
  i.InvoiceDate               AS [date],
  i.InvoiceNumber             AS num,
  CAST(NULL AS nvarchar(50))  AS manualNo,   -- map to your 'manual number' column
  CAST(NULL AS nvarchar(10))  AS currency,   -- map to the invoice currency code (empty = Rs.)
  CAST(NULL AS nvarchar(100)) AS company,    -- map to the company column
  i.PaidStatus                AS paid,
  i.TotalAmount               AS amount,
  c.CustomerName              AS name,
  i.Terms                     AS terms,
  i.DueDate                   AS dueDate,
  p.PaymentDate               AS paidDate,
  COALESCE(p.AvgDaysToPay, DATEDIFF(day, i.DueDate, p.PaymentDate)) AS avgDaysToPay,
  p.PaymentAmount             AS paidAmount,
  p.PaymentMethod             AS paymentMethod,
  sr.RepCode                  AS rep,
  sr.RepName                  AS repName,
  i.Status                    AS status,
  c.CustomerID                AS customerId
FROM dbo.Payments p
JOIN dbo.Invoices i               ON i.InvoiceID = p.InvoiceID
JOIN dbo.Customers c              ON c.CustomerID = i.CustomerID
LEFT JOIN dbo.SalesRepresentatives sr ON sr.SalesRepID = i.SalesRepID;
GO

CREATE OR ALTER VIEW dbo.v_open_invoices AS
SELECT
  i.[Type]                    AS [type],
  i.InvoiceDate               AS [date],
  i.InvoiceNumber             AS num,
  CAST(NULL AS nvarchar(50))  AS manualNo,   -- map to your 'manual number' column
  CAST(NULL AS nvarchar(10))  AS currency,   -- map to the invoice currency code (empty = Rs.)
  CAST(NULL AS nvarchar(100)) AS company,    -- map to the company column
  i.PONumber                  AS po,
  i.Terms                     AS terms,
  CASE WHEN DATEDIFF(day, i.DueDate, CAST(GETDATE() AS date)) > 0
       THEN DATEDIFF(day, i.DueDate, CAST(GETDATE() AS date)) ELSE 0 END AS aging,
  i.OpenBalance               AS openBalance,
  i.TotalAmount               AS amount,
  c.CustomerName              AS name,
  i.DueDate                   AS dueDate,
  sr.RepCode                  AS rep,
  sr.RepName                  AS repName,
  i.Status                    AS status,
  c.CustomerID                AS customerId,
  i.InvoiceID                 AS invoiceId,
  c.City                      AS city
FROM dbo.Invoices i
JOIN dbo.Customers c              ON c.CustomerID = i.CustomerID
LEFT JOIN dbo.SalesRepresentatives sr ON sr.SalesRepID = i.SalesRepID
WHERE i.OpenBalance > 0 AND i.Status <> 'Void';
GO

-- ---------------------------------------------------------------------
-- Read-only login for the backend (change the password!). The backend
-- only needs SELECT on the three views and on the catalogue.
-- ---------------------------------------------------------------------
-- CREATE LOGIN svc_reporting WITH PASSWORD = 'ChangeThisStrongPassword!1';
-- CREATE USER  svc_reporting FOR LOGIN svc_reporting;
-- GRANT SELECT ON dbo.v_sales_lines   TO svc_reporting;
-- GRANT SELECT ON dbo.v_payment_txns  TO svc_reporting;
-- GRANT SELECT ON dbo.v_open_invoices TO svc_reporting;
-- ALTER ROLE db_datareader ADD MEMBER svc_reporting;   -- optional: lets "Refresh data" count every table
