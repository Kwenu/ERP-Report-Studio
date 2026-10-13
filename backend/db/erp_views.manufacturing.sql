IF OBJECT_ID('dbo.v_manufacturing_quick', 'V') IS NOT NULL DROP VIEW dbo.v_manufacturing_quick;
GO
CREATE VIEW dbo.v_manufacturing_quick AS
WITH txn AS (
  SELECT tbl, code, name FROM (VALUES
    ('fAdjhed', '?', N'Lami. FG Adjustments Addition Entry'),
    ('fAdjhed', '?', N'Return Accept Quantity In Entry'),
    ('fAdjhed', '?', N'Return Reject Quantity In Entry'),
    ('fAdjhed', '?', N'FG Adjustments Addition Entry'),
    ('fAdjhed', '?', N'FG Adjustments Deduction Entry'),
    ('fAdjhed', '?', N'SF Adjustments Deduction Entry'),
    ('fmfgjbtrnhed', '?', N'Lami. FG Job Transfer'),
    ('fmfgjbtrnhed', '?', N'FG Job Transfer'),
    ('fmWstInHed', '?', N'FG To Waste'),
    ('fmWstInHed', '?', N'Wastage In Job Wise'),
    ('fIssRHed', '?', N'Acceptance Note'),
    ('fIssRHed', '?', N'INK Return Entry'),
    ('fRIssHed', '?', N'Issue - Coco'),
    ('fRIssHed', '?', N'Issue Extra - Coco'),
    ('fmpipAshed', '?', N'Pipe Build Assembly'),
    ('fmpipAshed', '?', N'Pipe Waste Build Allocation'),
    ('FiRIssHed', '?', N'INK Issue Note'),
    ('FiRIssHed', '?', N'Issue Note'),
    ('flRIssHed', '?', N'Issue Note - Standard (Lami)'),
    ('flRIssHed', '?', N'Issue Note - Extra (Lami)'),
    ('fmStTrnhed', '?', N'Site Transfer FG'),
    ('fmStTrnhed', '?', N'Site Transfer WIP')
  ) v(tbl, code, name)
)
  SELECT
    CAST('fCsMatHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Customer Mat. In' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fCsMatHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.comcode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fCsMatHed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fSoBldAsHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'SO Build Assembly' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fSoBldAsHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.machcode) AS nvarchar(200))                                               AS [machine],
    CAST(h.QtyW AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.Qty AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fSoBldAsHed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fmSFgTranHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Finish Good Trn. SO' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmSFgTranHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.QtyPc AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(NULL AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmSFgTranHed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fAdjhed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(COALESCE(m.name, N'Adjustment Entry') AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fAdjhed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.comcode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fAdjhed h
  LEFT JOIN txn m ON m.tbl = 'fAdjhed' AND m.code = RTRIM(h.TxnType)

  UNION ALL

  SELECT
    CAST('fmfgjbtrnhed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(COALESCE(m.name, N'FG Job Transfer') AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmfgjbtrnhed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.QtyPc AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(NULL AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmfgjbtrnhed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode
  LEFT JOIN txn m ON m.tbl = 'fmfgjbtrnhed' AND m.code = RTRIM(h.TxnType)

  UNION ALL

  SELECT
    CAST('fAdjRolHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'WIP Adjustments Addition Entry' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fAdjRolHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(CASE WHEN h.IsKg = 1 THEN h.Qty END AS numeric(18,4))                                                      AS [qtyKg],
    CAST(CASE WHEN h.IsKg = 1 THEN NULL ELSE h.Qty END AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(NULL AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fAdjRolHed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fmWstInHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(COALESCE(m.name, N'Waste In') AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmWstInHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.MachCode) AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.QtyPc AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmWstInHed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode
  LEFT JOIN txn m ON m.tbl = 'fmWstInHed' AND m.code = RTRIM(h.TxnType)

  UNION ALL

  SELECT
    CAST('fLmpHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Lumps Crush Process' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fLmpHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.machcode) AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fLmpHed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fmPipOrdhed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Sales Order - Pipes' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmPipOrdhed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmPipOrdhed h

  UNION ALL

  SELECT
    CAST('fIssHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Wastage Transfer' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fIssHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fIssHed h

  UNION ALL

  SELECT
    CAST('fIssRHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(COALESCE(m.name, N'Acceptance / Return Note') AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fIssRHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fIssRHed h
  LEFT JOIN txn m ON m.tbl = 'fIssRHed' AND m.code = RTRIM(h.TxnType)

  UNION ALL

  SELECT
    CAST('fRIssHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(COALESCE(m.name, N'Issue - Coco') AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fRIssHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.Refno1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fRIssHed h
  LEFT JOIN txn m ON m.tbl = 'fRIssHed' AND m.code = RTRIM(h.TxnType)

  UNION ALL

  SELECT
    CAST('fAccpHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Acceptance Note' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fAccpHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fAccpHed h

  UNION ALL

  SELECT
    CAST('fmBuAshed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Build Assembly - Cocopeat' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmBuAshed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.MachCode) AS nvarchar(200))                                               AS [machine],
    CAST(h.AloQtyKg AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.AloQty AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.PrvStagCode) AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmBuAshed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fmJbTrnhed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Job Transfer' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmJbTrnhed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.QtyPc AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(NULL AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmJbTrnhed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fmFgTranHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Finish Good Transfer' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmFgTranHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.QtyPc AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(NULL AS nvarchar(200))                                                AS [location],
    CAST(NULL AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmFgTranHed h

  UNION ALL

  SELECT
    CAST('fmWstAshed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Wastage Build Assembly' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmWstAshed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.MachCode) AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.AloQty AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(NULL AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmWstAshed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fWstHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Wastage Purchase' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fWstHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fWstHed h

  UNION ALL

  SELECT
    CAST('fmSfAshed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Stretch Film Build Assembly' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmSfAshed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.MachCode) AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.AloQty AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmSfAshed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fmJmTrnhed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Jumbo Roll Transfer' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmJmTrnhed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.MachCode) AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.AloQty AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(NULL AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmJmTrnhed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fmMixAshed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Mixer Build Assembly' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmMixAshed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.MachCode) AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.AloQty AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(NULL AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmMixAshed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fmpipAshed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(COALESCE(m.name, N'Pipe Build Assembly') AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmpipAshed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.machcode) AS nvarchar(200))                                               AS [machine],
    CAST(h.TotWeight AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.TotQty AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(NULL AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmpipAshed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode
  LEFT JOIN txn m ON m.tbl = 'fmpipAshed' AND m.code = RTRIM(h.TxnType)

  UNION ALL

  SELECT
    CAST('fmlsAshed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Local Sale Build Assembly' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmlsAshed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.MachCode) AS nvarchar(200))                                               AS [machine],
    CAST(h.AloQtyKg AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.AloQty AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.PrvStagCode) AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmlsAshed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fAgloHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Aglo Process' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fAgloHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.machcode) AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fAgloHed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fmInkAshed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Special Ink Build Assembly' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmInkAshed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.MachCode) AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.AloQty AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(NULL AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmInkAshed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('FiRIssHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(COALESCE(m.name, N'Issue Note') AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('FiRIssHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.Refno1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.FiRIssHed h
  LEFT JOIN txn m ON m.tbl = 'FiRIssHed' AND m.code = RTRIM(h.TxnType)

  UNION ALL

  SELECT
    CAST('fiAccpHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'INK Acceptance Note' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fiAccpHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fiAccpHed h

  UNION ALL

  SELECT
    CAST('flRIssHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(COALESCE(m.name, N'Issue Note (Lami)') AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('flRIssHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.flRIssHed h
  LEFT JOIN txn m ON m.tbl = 'flRIssHed' AND m.code = RTRIM(h.TxnType)

  UNION ALL

  SELECT
    CAST('fBldAsmbHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Build Assembly' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fBldAsmbHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.machcode) AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.FSiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.FLocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fBldAsmbHed h

  UNION ALL

  SELECT
    CAST('flrIssRHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Issue Return (Lami)' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('flrIssRHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.flrIssRHed h

  UNION ALL

  SELECT
    CAST('fmLspAsHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Packing & Other Build Assembly' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmLspAsHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(RTRIM(h.machcode) AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.AloQty AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(NULL AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmLspAsHed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('FMixOHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Mix INK Out Note' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('FMixOHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.FMixOHed h

  UNION ALL

  SELECT
    CAST('fMixHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Mix INK In Entry' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fMixHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.jobno) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(NULL AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fMixHed h

  UNION ALL

  SELECT
    CAST('fmStTrnhed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(COALESCE(m.name, N'Site Transfer') AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmStTrnhed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.QtyPc AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.sitecode) AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.stagcode) AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.comcode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmStTrnhed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode
  LEFT JOIN txn m ON m.tbl = 'fmStTrnhed' AND m.code = RTRIM(h.TxnType)

  UNION ALL

  SELECT
    CAST('fmRFgTranHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Roll FGTransfer' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmRFgTranHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.QtyPc AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(NULL AS nvarchar(200))                                                AS [location],
    CAST(NULL AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmRFgTranHed h

  UNION ALL

  SELECT
    CAST('fmRStTrnhed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Site Transfer Entry-SF' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmRStTrnhed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.QtyPc AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(NULL AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmRStTrnhed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fOpnhed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Job Wise Opening Balance' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fOpnhed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.JobNo) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fOpnhed h

  UNION ALL

  SELECT
    CAST('fmLFgTranHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'FG Transfer (Lami)' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmLFgTranHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.QtyPc AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(NULL AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmLFgTranHed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('flmWstInHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Waste In - Lami' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('flmWstInHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.flmWstInHed h

  UNION ALL

  SELECT
    CAST('fmSizTranHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Pipe Size Transfer' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmSizTranHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(NULL AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(h.TotWeight AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.TotQty AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(RTRIM(h.StagCode) AS nvarchar(200))                                                AS [stage],
    CAST(NULL AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.ComCode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmSizTranHed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('fmPStTrnhed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Site Transfer Entry-Pipe' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('fmPStTrnhed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(RTRIM(h.ItemCode) AS nvarchar(200))                                                AS [itemCode],
    CAST(RTRIM(it.ItemName) AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(h.Qty AS numeric(18,4))                                                      AS [qtyKg],
    CAST(h.QtyPc AS numeric(18,4))                                                      AS [pieces],
    CAST(NULL AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(NULL AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.fmPStTrnhed h
  LEFT JOIN dbo.fItems it ON it.ItemCode = h.ItemCode

  UNION ALL

  SELECT
    CAST('frDispHed:' + RTRIM(h.RefNo) AS nvarchar(200))            AS [lineId],
    CAST(N'Sample Gate Pass' AS nvarchar(200))                               AS [type],
    CAST(RTRIM(h.TxnType) AS nvarchar(200))                                                AS [txnType],
    CAST('frDispHed' AS nvarchar(200))                              AS [source],
    CAST(RTRIM(h.RefNo) AS nvarchar(200))                      AS [reference],
    CAST(h.TxnDate AS date)                                    AS [date],
    CAST(RTRIM(h.RefNo1) AS nvarchar(200))                                                AS [jobNo],
    CAST(RTRIM(h.ManuRef) AS nvarchar(200))                                               AS [manualNo],
    CAST(NULL AS nvarchar(200))                                                AS [itemCode],
    CAST(NULL AS nvarchar(200))                                                    AS [itemName],
    CAST(NULL AS nvarchar(200))                                               AS [machine],
    CAST(NULL AS numeric(18,4))                                                      AS [qtyKg],
    CAST(NULL AS numeric(18,4))                                                      AS [pieces],
    CAST(RTRIM(h.SiteCode) AS nvarchar(200))                                               AS [site],
    CAST(NULL AS nvarchar(200))                                                AS [stage],
    CAST(RTRIM(h.LocCode) AS nvarchar(200))                                                AS [location],
    CAST(RTRIM(h.comcode) AS nvarchar(200))                                                AS [company],
    CAST(RTRIM(h.CostCode) AS nvarchar(200))                                               AS [costCentre]
  FROM dbo.frDispHed h
;
GO

SELECT TOP 20 * FROM dbo.v_manufacturing_quick ORDER BY [date] DESC;
