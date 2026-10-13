USE [POLYDIME_ERP];
GO

IF OBJECT_ID('dbo.v_invoice_company', 'V') IS NOT NULL DROP VIEW dbo.v_invoice_company;
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
  h.ManuRef                                    AS manualNo,
  h.CurCode                                    AS currency,
  NULLIF(LTRIM(RTRIM(CAST(h.ComCode AS nvarchar(100)))), '')  AS company,
  deb.DebName                                  AS name,
  h.CrdTemCode                                 AS terms,
  CAST(DATEADD(day, CAST(ISNULL(deb.CrdPeriod, 0) AS int), h.TxnDate) AS date) AS dueDate,
  COALESCE(NULLIF(d.ItemDesc, ''), it.ItemName) AS item,
  it.ICatCode                                  AS category,
  CASE WHEN h.TotalAmt > 0 AND ISNULL(rc.received, 0) >= h.TotalAmt - 0.005 THEN 'Yes' ELSE 'No' END AS paid,
  d.Qty                                        AS qty,
  d.SellPrice                                  AS salesPrice,   
  d.Amt                                        AS amount,
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
  h.ManuRef                                    AS manualNo,
  h.CurCode                                    AS currency,
  NULLIF(LTRIM(RTRIM(CAST(h.ComCode AS nvarchar(100)))), '')  AS company,
  CASE WHEN h.TotalAmt > 0 AND ISNULL(rc.received, 0) >= h.TotalAmt - 0.005 THEN 'Yes' ELSE 'No' END AS paid,
  h.TotalAmt                                   AS amount,       -- invoice currency
  deb.DebName                                  AS name,
  h.CrdTemCode                                 AS terms,
  CAST(DATEADD(day, CAST(ISNULL(deb.CrdPeriod, 0) AS int), h.TxnDate) AS date) AS dueDate,
  CAST(rh.TxnDate AS date)                     AS paidDate,
  DATEDIFF(day, DATEADD(day, CAST(ISNULL(deb.CrdPeriod, 0) AS int), h.TxnDate), rh.TxnDate) AS avgDaysToPay,
  r.Amt                                        AS paidAmount,   -- invoice currency
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
  h.ManuRef                                    AS manualNo,
  h.CurCode                                    AS currency,
  NULLIF(LTRIM(RTRIM(CAST(h.ComCode AS nvarchar(100)))), '')  AS company,
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

IF OBJECT_ID('dbo.v_ar_summary', 'V') IS NOT NULL DROP VIEW dbo.v_ar_summary;
GO
CREATE VIEW dbo.v_ar_summary AS
SELECT
  CAST(RTRIM(n.DebCode) AS nvarchar(200))      AS customerId,
  CAST(RTRIM(deb.DebName) AS nvarchar(200))    AS name,
  CAST(RTRIM(deb.DbGrCode) AS nvarchar(200))   AS customerGroup,
  CAST(RTRIM(n.CurCode) AS nvarchar(200))      AS currency,
  SUM(n.TotBal)                                AS balance,
  COUNT(*)                                     AS documents
FROM dbo.fDdbNote n
LEFT JOIN dbo.fDebtor deb ON deb.DebCode = n.DebCode
GROUP BY n.DebCode, deb.DebName, deb.DbGrCode, n.CurCode
HAVING ABS(SUM(n.TotBal)) > 0.005;
GO

IF OBJECT_ID('dbo.v_ar_transactions', 'V') IS NOT NULL DROP VIEW dbo.v_ar_transactions;
GO
CREATE VIEW dbo.v_ar_transactions AS
  SELECT
    CAST('INV:' + RTRIM(h.RefNo) + ':' + CAST(d.RecordId AS varchar(20)) AS nvarchar(200)) AS [lineId],
    CAST(RTRIM(h.DebCode) AS nvarchar(200))                                AS [customerId],
    CAST('INV' AS nvarchar(200))                                           AS [type],
    CAST(h.TxnDate AS date)                                                AS [date],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                                  AS [reference],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                AS [manualNo],
    CAST(NULL AS nvarchar(200))                                            AS [invoiceNo],
    CAST(RTRIM(h.Remarks) AS nvarchar(200))                                AS [remarks],
    CAST(RTRIM(j.CusPo) AS nvarchar(200))                                  AS [customerPo],
    CAST(RTRIM(deb.DebName) AS nvarchar(200))                              AS [name],
    CAST(RTRIM(d.Itemcode) AS nvarchar(200))                               AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                              AS [itemName],
    CAST(RTRIM(d.ItemDesc) AS nvarchar(200))                               AS [description],
    d.Qty                                                                  AS [qty],
    d.QtyKG                                                                AS [qtyKg],
    d.SellPrice                                                            AS [salesPrice],
    d.Amt                                                                  AS [amount],
    d.BAmt                                                                 AS [amountBase],
    h.TotBal                                                               AS [balance],
    CAST(RTRIM(COALESCE(NULLIF(RTRIM(d.RefNo1), ''), NULLIF(RTRIM(h.RefNo1), ''))) AS nvarchar(200)) AS [jobNo],
    CAST(RTRIM(j.ManuRef) AS nvarchar(200))                                AS [jobManualNo],
    d.TaxAmt                                                               AS [taxAmount],
    CAST(RTRIM(d.TaxComCode) AS nvarchar(200))                             AS [status],
    CAST(RTRIM(it.TypeCode) AS nvarchar(200))                              AS [itemType],
    CAST(RTRIM(it.subCatCode) AS nvarchar(200))                            AS [subType],
    CAST(RTRIM(it.IndCode) AS nvarchar(200))                               AS [industry],
    CAST(RTRIM(it.ICatCode) AS nvarchar(200))                              AS [category],
    CAST(RTRIM(it.ISCatCode) AS nvarchar(200))                             AS [subCategory],
    CAST(RTRIM(it.BrandCode) AS nvarchar(200))                             AS [brand],
    CAST(RTRIM(it.LifeCode) AS nvarchar(200))                              AS [lifeCycle],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                AS [company],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                AS [location],
    CAST(RTRIM(h.CrdTemCode) AS nvarchar(200))                             AS [terms],
    CAST(RTRIM(h.RepCode) AS nvarchar(200))                                AS [rep],
    CAST(RTRIM(sr.RepName) AS nvarchar(200))                               AS [repName],
    CAST(RTRIM(h.CurCode) AS nvarchar(200))                                AS [currency]
  FROM dbo.fInvdet d
  JOIN dbo.fInvhed h               ON h.RefNo = d.RefNo
  LEFT JOIN dbo.fDebtor deb        ON deb.DebCode = h.DebCode
  LEFT JOIN dbo.fSalRep sr         ON sr.RepCode = h.RepCode
  LEFT JOIN dbo.fItems it          ON it.ItemCode = d.Itemcode
  LEFT JOIN dbo.fmJobhed j         ON j.RefNo = COALESCE(NULLIF(RTRIM(d.RefNo1), ''), NULLIF(RTRIM(h.RefNo1), ''))

  UNION ALL

  SELECT
    CAST('DBN:' + RTRIM(n.RefNo) + ':' + CAST(n.RecordId AS varchar(20)) AS nvarchar(200)) AS [lineId],
    CAST(RTRIM(n.DebCode) AS nvarchar(200))                                AS [customerId],
    CAST('DBN' AS nvarchar(200))                                           AS [type],
    CAST(n.TxnDate AS date)                                                AS [date],
    CAST(RTRIM(n.RefNo) AS nvarchar(200))                                  AS [reference],
    CAST(RTRIM(n.ManuRef) AS nvarchar(200))                                AS [manualNo],
    CAST(RTRIM(n.RefInv) AS nvarchar(200))                                 AS [invoiceNo],
    CAST(RTRIM(n.Remarks) AS nvarchar(200))                                AS [remarks],
    CAST(NULL AS nvarchar(200))                                            AS [customerPo],
    CAST(RTRIM(deb.DebName) AS nvarchar(200))                              AS [name],
    CAST(NULL AS nvarchar(200))                                            AS [itemCode],
    CAST(NULL AS nvarchar(200))                                            AS [itemName],
    CAST(NULL AS nvarchar(200))                                            AS [description],
    CAST(NULL AS numeric(18,4))                                            AS [qty],
    CAST(NULL AS numeric(18,4))                                            AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                            AS [salesPrice],
    n.Amt                                                                  AS [amount],
    n.BAmt                                                                 AS [amountBase],
    n.TotBal                                                               AS [balance],
    CAST(RTRIM(n.jobno) AS nvarchar(200))                                  AS [jobNo],
    CAST(NULL AS nvarchar(200))                                            AS [jobManualNo],
    n.TaxAmt                                                               AS [taxAmount],
    CAST(RTRIM(n.TaxComCode) AS nvarchar(200))                             AS [status],
    CAST(NULL AS nvarchar(200))                                            AS [itemType],
    CAST(NULL AS nvarchar(200))                                            AS [subType],
    CAST(NULL AS nvarchar(200))                                            AS [industry],
    CAST(NULL AS nvarchar(200))                                            AS [category],
    CAST(NULL AS nvarchar(200))                                            AS [subCategory],
    CAST(NULL AS nvarchar(200))                                            AS [brand],
    CAST(NULL AS nvarchar(200))                                            AS [lifeCycle],
    CAST(RTRIM(n.ComCode) AS nvarchar(200))                                AS [company],
    CAST(NULL AS nvarchar(200))                                            AS [location],
    CAST(NULL AS nvarchar(200))                                            AS [terms],
    CAST(RTRIM(n.RepCode) AS nvarchar(200))                                AS [rep],
    CAST(RTRIM(sr.RepName) AS nvarchar(200))                               AS [repName],
    CAST(RTRIM(n.CurCode) AS nvarchar(200))                                AS [currency]
  FROM dbo.fDdbNote n
  LEFT JOIN dbo.fDebtor deb        ON deb.DebCode = n.DebCode
  LEFT JOIN dbo.fSalRep sr         ON sr.RepCode = n.RepCode
  WHERE LTRIM(RTRIM(n.TxnType)) = '20'

  UNION ALL

  SELECT
    CAST('CRD:' + RTRIM(h.RefNo) + ':' + CAST(COALESCE(d.RecordId, h.RecordId) AS varchar(20)) AS nvarchar(200)) AS [lineId],
    CAST(RTRIM(h.DebCode) AS nvarchar(200))                                AS [customerId],
    CAST('CRD' AS nvarchar(200))                                           AS [type],
    CAST(h.TxnDate AS date)                                                AS [date],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                                  AS [reference],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                AS [manualNo],
    CAST(RTRIM(d.RefNo1) AS nvarchar(200))                                 AS [invoiceNo],
    CAST(RTRIM(COALESCE(NULLIF(RTRIM(h.Remarks), ''), d.Remark)) AS nvarchar(200)) AS [remarks],
    CAST(NULL AS nvarchar(200))                                            AS [customerPo],
    CAST(RTRIM(deb.DebName) AS nvarchar(200))                              AS [name],
    CAST(NULL AS nvarchar(200))                                            AS [itemCode],
    CAST(NULL AS nvarchar(200))                                            AS [itemName],
    CAST(NULL AS nvarchar(200))                                            AS [description],
    CAST(NULL AS numeric(18,4))                                            AS [qty],
    CAST(NULL AS numeric(18,4))                                            AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                            AS [salesPrice],
    COALESCE(d.Amt, h.TotalAmt)                                            AS [amount],
    COALESCE(d.BAmt, h.BTotalAmt)                                          AS [amountBase],
    h.TotBal                                                               AS [balance],
    CAST(NULL AS nvarchar(200))                                            AS [jobNo],
    CAST(NULL AS nvarchar(200))                                            AS [jobManualNo],
    d.TaxAmt                                                               AS [taxAmount],
    CAST(NULL AS nvarchar(200))                                            AS [status],
    CAST(NULL AS nvarchar(200))                                            AS [itemType],
    CAST(NULL AS nvarchar(200))                                            AS [subType],
    CAST(NULL AS nvarchar(200))                                            AS [industry],
    CAST(NULL AS nvarchar(200))                                            AS [category],
    CAST(NULL AS nvarchar(200))                                            AS [subCategory],
    CAST(NULL AS nvarchar(200))                                            AS [brand],
    CAST(NULL AS nvarchar(200))                                            AS [lifeCycle],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                AS [company],
    CAST(NULL AS nvarchar(200))                                            AS [location],
    CAST(NULL AS nvarchar(200))                                            AS [terms],
    CAST(RTRIM(h.RepCode) AS nvarchar(200))                                AS [rep],
    CAST(RTRIM(sr.RepName) AS nvarchar(200))                               AS [repName],
    CAST(RTRIM(h.CurCode) AS nvarchar(200))                                AS [currency]
  FROM dbo.fDcnHed h
  LEFT JOIN dbo.fDcnDet d          ON d.RefNo = h.RefNo
  LEFT JOIN dbo.fDebtor deb        ON deb.DebCode = h.DebCode
  LEFT JOIN dbo.fSalRep sr         ON sr.RepCode = h.RepCode

  UNION ALL

  SELECT
    CAST('REC:' + RTRIM(h.RefNo) + ':' + CAST(COALESCE(d.RecordId, h.RecordId) AS varchar(20)) AS nvarchar(200)) AS [lineId],
    CAST(RTRIM(h.DebCode) AS nvarchar(200))                                AS [customerId],
    CAST('REC' AS nvarchar(200))                                           AS [type],
    CAST(h.TxnDate AS date)                                                AS [date],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                                  AS [reference],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                AS [manualNo],
    CAST(RTRIM(d.RefNo1) AS nvarchar(200))                                 AS [invoiceNo],
    CAST(RTRIM(h.Remarks) AS nvarchar(200))                                AS [remarks],
    CAST(NULL AS nvarchar(200))                                            AS [customerPo],
    CAST(RTRIM(deb.DebName) AS nvarchar(200))                              AS [name],
    CAST(NULL AS nvarchar(200))                                            AS [itemCode],
    CAST(NULL AS nvarchar(200))                                            AS [itemName],
    CAST(NULL AS nvarchar(200))                                            AS [description],
    CAST(NULL AS numeric(18,4))                                            AS [qty],
    CAST(NULL AS numeric(18,4))                                            AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                            AS [salesPrice],
    COALESCE(d.Amt, h.TotalAmt)                                            AS [amount],
    COALESCE(d.BAmt, h.BTotalAmt)                                          AS [amountBase],
    CAST(NULL AS numeric(18,4))                                            AS [balance],
    CAST(NULL AS nvarchar(200))                                            AS [jobNo],
    CAST(NULL AS nvarchar(200))                                            AS [jobManualNo],
    CAST(NULL AS numeric(18,4))                                            AS [taxAmount],
    CAST(NULL AS nvarchar(200))                                            AS [status],
    CAST(NULL AS nvarchar(200))                                            AS [itemType],
    CAST(NULL AS nvarchar(200))                                            AS [subType],
    CAST(NULL AS nvarchar(200))                                            AS [industry],
    CAST(NULL AS nvarchar(200))                                            AS [category],
    CAST(NULL AS nvarchar(200))                                            AS [subCategory],
    CAST(NULL AS nvarchar(200))                                            AS [brand],
    CAST(NULL AS nvarchar(200))                                            AS [lifeCycle],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                AS [company],
    CAST(NULL AS nvarchar(200))                                            AS [location],
    CAST(NULL AS nvarchar(200))                                            AS [terms],
    CAST(RTRIM(h.RepCode) AS nvarchar(200))                                AS [rep],
    CAST(RTRIM(sr.RepName) AS nvarchar(200))                               AS [repName],
    CAST(RTRIM(h.CurCode) AS nvarchar(200))                                AS [currency]
  FROM dbo.fDRecHed h
  LEFT JOIN dbo.fdrecdet d         ON d.RefNo = h.RefNo
  LEFT JOIN dbo.fDebtor deb        ON deb.DebCode = h.DebCode
  LEFT JOIN dbo.fSalRep sr         ON sr.RepCode = h.RepCode

  UNION ALL

  SELECT
    CAST('ALO:' + RTRIM(h.RefNo) + ':' + CAST(h.RecordId AS varchar(20)) AS nvarchar(200)) AS [lineId],
    CAST(RTRIM(h.DebCode) AS nvarchar(200))                                AS [customerId],
    CAST('ALO' AS nvarchar(200))                                           AS [type],
    CAST(h.TxnDate AS date)                                                AS [date],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                                  AS [reference],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                AS [manualNo],
    CAST(RTRIM(h.SaleRefNo) AS nvarchar(200))                              AS [invoiceNo],
    CAST(RTRIM(CASE WHEN NULLIF(RTRIM(h.AdvNo), '') IS NULL THEN h.Remarks ELSE 'Advance ' + RTRIM(h.AdvNo) + ' ' + RTRIM(ISNULL(h.Remarks, '')) END) AS nvarchar(200)) AS [remarks],
    CAST(NULL AS nvarchar(200))                                            AS [customerPo],
    CAST(RTRIM(deb.DebName) AS nvarchar(200))                              AS [name],
    CAST(NULL AS nvarchar(200))                                            AS [itemCode],
    CAST(NULL AS nvarchar(200))                                            AS [itemName],
    CAST(NULL AS nvarchar(200))                                            AS [description],
    CAST(NULL AS numeric(18,4))                                            AS [qty],
    CAST(NULL AS numeric(18,4))                                            AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                            AS [salesPrice],
    h.TotalAmt                                                             AS [amount],
    h.BTotalAmt                                                            AS [amountBase],
    CAST(NULL AS numeric(18,4))                                            AS [balance],
    CAST(NULL AS nvarchar(200))                                            AS [jobNo],
    CAST(NULL AS nvarchar(200))                                            AS [jobManualNo],
    CAST(NULL AS numeric(18,4))                                            AS [taxAmount],
    CAST(NULL AS nvarchar(200))                                            AS [status],
    CAST(NULL AS nvarchar(200))                                            AS [itemType],
    CAST(NULL AS nvarchar(200))                                            AS [subType],
    CAST(NULL AS nvarchar(200))                                            AS [industry],
    CAST(NULL AS nvarchar(200))                                            AS [category],
    CAST(NULL AS nvarchar(200))                                            AS [subCategory],
    CAST(NULL AS nvarchar(200))                                            AS [brand],
    CAST(NULL AS nvarchar(200))                                            AS [lifeCycle],
    CAST(NULL AS nvarchar(200))                                            AS [company],
    CAST(NULL AS nvarchar(200))                                            AS [location],
    CAST(NULL AS nvarchar(200))                                            AS [terms],
    CAST(RTRIM(h.RepCode) AS nvarchar(200))                                AS [rep],
    CAST(RTRIM(sr.RepName) AS nvarchar(200))                               AS [repName],
    CAST(RTRIM(h.CurCode) AS nvarchar(200))                                AS [currency]
  FROM dbo.fDAdAHed h
  LEFT JOIN dbo.fDebtor deb        ON deb.DebCode = h.DebCode
  LEFT JOIN dbo.fSalRep sr         ON sr.RepCode = h.RepCode;
GO

SELECT name FROM sys.views WHERE name IN ('v_sales_lines', 'v_payment_txns', 'v_open_invoices', 'v_ar_summary', 'v_ar_transactions');