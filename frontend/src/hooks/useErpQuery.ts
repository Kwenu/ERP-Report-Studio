import { useCallback, useEffect, useState } from 'react';
import type { QueryResultMeta, ReportDefinition, Row } from '../types/erp';
import { fetchDatasetRows, fetchTableRows } from '../services/erpApi';
import { useErpConnection } from '../contexts/ErpConnectionContext';

const SEP = '\u0001';

/**
 * Every column the report needs from an ERP table: the shown columns plus whatever its filters, sorting,
 * grouping and calculated fields refer to (those are applied in the browser by the report engine).
 */
function neededKeys(def: ReportDefinition): string[] {
  const calculated = new Set((def.calculatedFields ?? []).map((c) => c.key));
  const keys = new Set<string>();
  def.columns.forEach((c) => keys.add(c.key));
  def.filters.forEach((f) => keys.add(f.key));
  def.sort.forEach((s) => keys.add(s.key));
  if (def.groupBy) keys.add(def.groupBy);
  (def.calculatedFields ?? []).forEach((c) => {
    keys.add(c.left);
    keys.add(c.right);
  });
  calculated.forEach((k) => keys.delete(k));
  return [...keys].filter(Boolean).sort();
}

/**
 * Loads the report's rows from the ERP database through the backend whenever the source, the fields it uses
 * or the date range change (or Refresh is pressed):
 *   Studio → API → Query Engine → ERP Database → rows
 * Standard reports read one of the curated datasets. Report Builder reports read just the columns they use
 * from one real ERP table. Filters / grouping / pivoting / totals are applied afterwards by the report engine.
 */
export function useErpQuery(definition: ReportDefinition, dataSourceName: string) {
  const { activeSource } = useErpConnection();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<QueryResultMeta>({
    state: 'idle',
    records: 0,
    executionMs: 0,
    completedAt: new Date().toISOString(),
    dataSource: dataSourceName
  });
  const [nonce, setNonce] = useState(0);

  const isTable = definition.dataset === 'erpTable';
  const tableColumns = isTable ? neededKeys(definition).join(SEP) : '';

  useEffect(() => {
    let cancelled = false;

    if (isTable && (!definition.sourceTable || !tableColumns)) {
      // Nothing to read yet: the report has no fields.
      setRows([]);
      setMeta({ state: 'complete', records: 0, executionMs: 0, completedAt: new Date().toISOString(), dataSource: dataSourceName });
      return undefined;
    }

    setMeta((prev) => ({ ...prev, state: 'running', error: undefined, dataSource: dataSourceName }));
    const request = isTable ?
    activeSource.id === 'none' ?
    Promise.reject(new Error('No data source is connected. Add one on the Data Sources page.')) :
    fetchTableRows(activeSource.id, definition.sourceTable as string, tableColumns.split(SEP)) :
    fetchDatasetRows(definition);

    request.
    then((response) => {
      if (cancelled) return;
      setRows(response.rows as Row[]);
      setMeta({
        state: 'complete',
        records: response.records,
        executionMs: response.executionMs,
        completedAt: response.completedAt,
        dataSource: dataSourceName,
        truncated: response.truncated
      });
    }).
    catch((err: Error) => {
      if (cancelled) return;
      setRows([]);
      setMeta((prev) => ({ ...prev, state: 'error', error: err.message }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition.dataset, definition.sourceTable, tableColumns, definition.dateFrom, definition.dateTo, nonce, dataSourceName, activeSource.id]);

  const rerun = useCallback(() => setNonce((n) => n + 1), []);

  return { meta, rerun, rows };
}
