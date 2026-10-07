USE [POLYDIME_ERP];
GO

IF OBJECT_ID('dbo.v_sales_lines', 'V') IS NOT NULL DROP VIEW dbo.v_sales_lines;
GO
CREATE VIEW dbo.v_sales_lines AS
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
  LTRIM(RTRIM(ISNULL(deb.DebAdd1, '') + ' ' + ISNULL(deb.DebAdd2, ''))) AS address,
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

IF OBJECT_ID('dbo.v_payment_txns', 'V') IS NOT NULL DROP VIEW dbo.v_payment_txns;
GO
CREATE VIEW dbo.v_payment_txns AS
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

IF OBJECT_ID('dbo.v_open_invoices', 'V') IS NOT NULL DROP VIEW dbo.v_open_invoices;
GO
CREATE VIEW dbo.v_open_invoices AS
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

SELECT name FROM sys.views WHERE name IN ('v_sales_lines', 'v_payment_txns', 'v_open_invoices');