-- =====================================================================
-- ERP Report Studio — report views for the POLYDIME_ERP database
-- Run in SSMS on database POLYDIME_ERP (needs permission to CREATE VIEW).
--
-- Source tables (from your catalogue):
--   fInvhed / fInvdet   sales invoices (header / lines). Cancelled invoices are
--                       moved to lInvdet, so everything in fInvhed is live.
--   fDebtor             customers        fSalRep   sales reps       fItems  items
--   fDRecHed / fdrecdet customer receipts (header / lines); fdrecdet.RefNo1 = the
--                       invoice number the receipt line settles
--
-- NOTE: fInvhed.TotBal / TotAllo are NOT maintained in your system (balance = full
-- amount on every invoice), so "paid" and "open balance" are calculated from the
-- receipt lines instead. Amounts use the base-currency columns (BAmt, BSellPrice,
-- BTotalAmt?) — see the checks at the bottom of this file.
-- =====================================================================

CREATE OR ALTER VIEW dbo.v_sales_lines AS
SELECT
  d.RecordId                                   AS lineId,
  h.RecordId                                   AS invoiceId,
  h.DebCode                                    AS customerId,
  CAST(h.TxnDate AS date)                      AS [date],
  h.RefNo                                      AS num,
  deb.DebName                                  AS name,
  h.CrdTemCode                                 AS terms,
  CAST(DATEADD(day, CAST(ISNULL(deb.CrdPeriod, 0) AS int), h.TxnDate) AS date) AS dueDate,
  COALESCE(NULLIF(d.ItemDesc, ''), it.ItemName) AS item,
  it.ICatCode                                  AS category,
  CASE WHEN h.TotalAmt > 0 AND ISNULL(rc.received, 0) >= h.TotalAmt - 0.005 THEN 'Yes' ELSE 'No' END AS paid,
  d.Qty                                        AS qty,
  d.BSellPrice                                 AS salesPrice,
  d.BAmt                                       AS amount,
  h.RepCode                                    AS rep,
  sr.RepName                                   AS repName,
  CAST(NULL AS nvarchar(100))                  AS department,
  CASE WHEN h.TotalAmt > 0 AND ISNULL(rc.received, 0) >= h.TotalAmt - 0.005 THEN 'Paid' ELSE 'Open' END AS status,
  deb.DebAdd3                                  AS city,
  h.ManuRef                                    AS po,
  it.UnitCode                                  AS uom,
  d.Itemcode                                   AS itemId,
  h.RepCode                                    AS repId,
  deb.DebEMail                                 AS email,
  deb.CrdLimit                                 AS creditLimit,
  h.Remarks                                    AS memo,
  CAST(NULL AS nvarchar(100))                  AS other1,
  h.ManuRef                                    AS other2,
  LTRIM(RTRIM(CONCAT(deb.DebAdd1, ' ', deb.DebAdd2))) AS address,
  deb.DebTele                                  AS phone,
  deb.AreaCode                                 AS territory
FROM dbo.fInvdet d
JOIN dbo.fInvhed h             ON h.RefNo = d.RefNo
LEFT JOIN dbo.fDebtor deb      ON deb.DebCode = h.DebCode
LEFT JOIN dbo.fSalRep sr       ON sr.RepCode = h.RepCode
LEFT JOIN dbo.fItems it        ON it.ItemCode = d.Itemcode
LEFT JOIN (SELECT RefNo1, SUM(Amt) AS received FROM dbo.fdrecdet GROUP BY RefNo1) rc
                               ON rc.RefNo1 = h.RefNo;
GO

CREATE OR ALTER VIEW dbo.v_payment_txns AS
SELECT
  r.RecordId                                   AS paymentId,
  h.RecordId                                   AS invoiceId,
  CAST(h.TxnDate AS date)                      AS [date],
  h.RefNo                                      AS num,
  CASE WHEN h.TotalAmt > 0 AND ISNULL(rc.received, 0) >= h.TotalAmt - 0.005 THEN 'Yes' ELSE 'No' END AS paid,
  h.BTotalAmt                                  AS amount,
  deb.DebName                                  AS name,
  h.CrdTemCode                                 AS terms,
  CAST(DATEADD(day, CAST(ISNULL(deb.CrdPeriod, 0) AS int), h.TxnDate) AS date) AS dueDate,
  CAST(rh.TxnDate AS date)                     AS paidDate,
  DATEDIFF(day, DATEADD(day, CAST(ISNULL(deb.CrdPeriod, 0) AS int), h.TxnDate), rh.TxnDate) AS avgDaysToPay,
  r.BAmt                                       AS paidAmount,
  rh.PayType                                   AS paymentMethod,
  h.RepCode                                    AS rep,
  sr.RepName                                   AS repName,
  CASE WHEN h.TotalAmt > 0 AND ISNULL(rc.received, 0) >= h.TotalAmt - 0.005 THEN 'Paid' ELSE 'Open' END AS status,
  h.DebCode                                    AS customerId
FROM dbo.fdrecdet r
JOIN dbo.fDRecHed rh           ON rh.RefNo = r.RefNo
JOIN dbo.fInvhed h             ON h.RefNo = r.RefNo1
LEFT JOIN dbo.fDebtor deb      ON deb.DebCode = h.DebCode
LEFT JOIN dbo.fSalRep sr       ON sr.RepCode = h.RepCode
LEFT JOIN (SELECT RefNo1, SUM(Amt) AS received FROM dbo.fdrecdet GROUP BY RefNo1) rc
                               ON rc.RefNo1 = h.RefNo;
GO

CREATE OR ALTER VIEW dbo.v_open_invoices AS
SELECT
  'Invoice'                                    AS [type],
  CAST(h.TxnDate AS date)                      AS [date],
  h.RefNo                                      AS num,
  h.ManuRef                                    AS po,
  h.CrdTemCode                                 AS terms,
  CASE WHEN DATEDIFF(day, DATEADD(day, CAST(ISNULL(deb.CrdPeriod, 0) AS int), h.TxnDate), CAST(GETDATE() AS date)) > 0
       THEN DATEDIFF(day, DATEADD(day, CAST(ISNULL(deb.CrdPeriod, 0) AS int), h.TxnDate), CAST(GETDATE() AS date))
       ELSE 0 END                              AS aging,
  h.TotalAmt - ISNULL(rc.received, 0)          AS openBalance,
  h.TotalAmt                                   AS amount,
  deb.DebName                                  AS name,
  CAST(DATEADD(day, CAST(ISNULL(deb.CrdPeriod, 0) AS int), h.TxnDate) AS date) AS dueDate,
  h.RepCode                                    AS rep,
  sr.RepName                                   AS repName,
  'Open'                                       AS status,
  h.DebCode                                    AS customerId,
  h.RecordId                                   AS invoiceId,
  deb.DebAdd3                                  AS city
FROM dbo.fInvhed h
LEFT JOIN dbo.fDebtor deb      ON deb.DebCode = h.DebCode
LEFT JOIN dbo.fSalRep sr       ON sr.RepCode = h.RepCode
LEFT JOIN (SELECT RefNo1, SUM(Amt) AS received FROM dbo.fdrecdet GROUP BY RefNo1) rc
                               ON rc.RefNo1 = h.RefNo
WHERE h.TotalAmt - ISNULL(rc.received, 0) > 0.005;
GO

-- ---------------------------------------------------------------------
-- Read-only access for the backend (do NOT run the backend as "sa").
-- ---------------------------------------------------------------------
-- CREATE LOGIN svc_reporting WITH PASSWORD = 'ChangeThisStrongPassword!1';
-- CREATE USER  svc_reporting FOR LOGIN svc_reporting;
-- GRANT SELECT ON dbo.v_sales_lines   TO svc_reporting;
-- GRANT SELECT ON dbo.v_payment_txns  TO svc_reporting;
-- GRANT SELECT ON dbo.v_open_invoices TO svc_reporting;
-- ALTER ROLE db_datareader ADD MEMBER svc_reporting;

-- ---------------------------------------------------------------------
-- CHECKS — run these after creating the views and send me the results
-- ---------------------------------------------------------------------
-- 1) Line amounts add up to invoice totals? (diff should be ~0 for most rows)
-- SELECT TOP 10 h.RefNo, h.TotalAmt, h.BTotalAmt, SUM(d.Amt) AS lines_amt, SUM(d.BAmt) AS lines_bamt, h.CurCode
-- FROM fInvhed h JOIN fInvdet d ON d.RefNo = h.RefNo GROUP BY h.RefNo, h.TotalAmt, h.BTotalAmt, h.CurCode;
--
-- 2) Do receipt lines really match invoices?
-- SELECT COUNT(*) AS receipt_lines,
--        SUM(CASE WHEN EXISTS (SELECT 1 FROM fInvhed h WHERE h.RefNo = r.RefNo1) THEN 1 ELSE 0 END) AS matching_invoices
-- FROM fdrecdet r;
--
-- 3) Row counts per view
-- SELECT (SELECT COUNT(*) FROM v_sales_lines) AS sales_lines,
--        (SELECT COUNT(*) FROM v_payment_txns) AS payments,
--        (SELECT COUNT(*) FROM v_open_invoices) AS open_invoices;
