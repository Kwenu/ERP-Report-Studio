import { useCallback, useEffect, useState } from 'react';
import type { QueryResultMeta, ReportDefinition, Row } from '../types/erp';
import { fetchDatasetRows } from '../services/erpApi';

/**
 * Loads the report's rows from the ERP database through the backend whenever the
 * dataset or date range changes (or Refresh is pressed):
 *   Studio → API → Query Engine → ERP Database → rows
 * Filters / grouping / sorting / totals are applied afterwards by the report engine.
 */
export function useErpQuery(definition: ReportDefinition, dataSourceName: string) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<QueryResultMeta>({
    state: 'idle',
    records: 0,
    executionMs: 0,
    completedAt: new Date().toISOString(),
    dataSource: dataSourceName
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setMeta((prev) => ({ ...prev, state: 'running', error: undefined, dataSource: dataSourceName }));
    fetchDatasetRows(definition)
      .then((response) => {
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
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setMeta((prev) => ({ ...prev, state: 'error', error: err.message }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition.dataset, definition.dateFrom, definition.dateTo, nonce, dataSourceName]);

  const rerun = useCallback(() => setNonce((n) => n + 1), []);

  return { meta, rerun, rows };
}
