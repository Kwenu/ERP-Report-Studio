-- OPTIONAL speed-up for the Manufacturing Quick Report (run once in SSMS on the ERP database by someone allowed to
-- change it - the reporting login is read-only). It adds a small index on TxnDate to every transaction header table
-- the report reads, so a date range such as Nov 1 - Nov 16 reads only those days instead of the whole table.
-- Safe to re-run: a table that has no TxnDate column, or already has an index starting with it, is skipped.
SET NOCOUNT ON;
DECLARE @t sysname, @sql nvarchar(max);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT n FROM (VALUES ('FMixOHed'),('FiRIssHed'),('fAccpHed'),('fAdjRolHed'),('fAdjhed'),('fAgloHed'),('fBldAsmbHed'),('fCsMatHed'),('fIssHed'),('fIssRHed'),('fLmpHed'),('fMixHed'),('fOpnhed'),('fRIssHed'),('fSoBldAsHed'),('fWstHed'),('fiAccpHed'),('flRIssHed'),('flmWstInHed'),('flrIssRHed'),('fmBuAshed'),('fmFgTranHed'),('fmInkAshed'),('fmJbTrnhed'),('fmJmTrnhed'),('fmLFgTranHed'),('fmLspAsHed'),('fmMixAshed'),('fmPStTrnhed'),('fmPipOrdhed'),('fmRFgTranHed'),('fmRStTrnhed'),('fmSFgTranHed'),('fmSfAshed'),('fmSizTranHed'),('fmStTrnhed'),('fmWstAshed'),('fmWstInHed'),('fmfgjbtrnhed'),('fmlsAshed'),('fmpipAshed'),('frDispHed')) v(n);
OPEN c; FETCH NEXT FROM c INTO @t;
WHILE @@FETCH_STATUS = 0
BEGIN
  IF OBJECT_ID('dbo.' + QUOTENAME(@t), 'U') IS NOT NULL
     AND COL_LENGTH('dbo.' + QUOTENAME(@t), 'TxnDate') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM sys.index_columns ic
       JOIN sys.columns col ON col.object_id = ic.object_id AND col.column_id = ic.column_id
       WHERE ic.object_id = OBJECT_ID('dbo.' + QUOTENAME(@t)) AND ic.key_ordinal = 1 AND col.name = 'TxnDate')
  BEGIN
    SET @sql = N'CREATE NONCLUSTERED INDEX ' + QUOTENAME('IX_rs_' + @t + '_TxnDate') + N' ON dbo.' + QUOTENAME(@t) + N' (TxnDate)';
    BEGIN TRY EXEC (@sql); PRINT 'Created index on ' + @t; END TRY
    BEGIN CATCH PRINT 'Skipped ' + @t + ': ' + ERROR_MESSAGE(); END CATCH
  END
  FETCH NEXT FROM c INTO @t;
END
CLOSE c; DEALLOCATE c;
