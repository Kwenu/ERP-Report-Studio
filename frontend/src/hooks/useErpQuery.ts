import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueryResultMeta, ReportDefinition } from '../types/erp';
import { runQuery } from '../services/erpApi';

/**
 * Runs the report definition against the simulated backend whenever the
 * definition changes: Studio → API → Query Engine → ERP Database → results.
 * Row data is resolved locally for the prototype, but every state the UI
 * shows (running, record count, execution time, last updated) comes from
 * the round trip.
 */
export function useErpQuery(
definition: ReportDefinition,
filteredRecordCount: number,
dataSourceName: string)
{
  const recordRef = useRef(filteredRecordCount);
  recordRef.current = filteredRecordCount;

  const [meta, setMeta] = useState<QueryResultMeta>({
    state: 'idle',
    records: filteredRecordCount,
    executionMs: 0,
    completedAt: new Date().toISOString(),
    dataSource: dataSourceName
  });
  const [nonce, setNonce] = useState(0);

  const signature = JSON.stringify({
    dataset: definition.dataset,
    columns: definition.columns.filter((c) => c.visible).map((c) => c.key),
    groupBy: definition.groupBy,
    filters: definition.filters.map((f) => [f.key, f.operator, f.value, f.value2]),
    sort: definition.sort.map((s) => [s.key, s.dir]),
    from: definition.dateFrom,
    to: definition.dateTo,
    basis: definition.basis
  });

  useEffect(() => {
    const signal = { cancelled: false };
    setMeta((prev) => ({ ...prev, state: 'running', dataSource: dataSourceName }));
    runQuery(definition, signal).
    then((response) => {
      if (signal.cancelled) return;
      setMeta({
        state: 'complete',
        records: recordRef.current,
        executionMs: response.executionMs,
        completedAt: response.completedAt,
        dataSource: dataSourceName
      });
    }).
    catch(() => {
      if (signal.cancelled) return;
      setMeta((prev) => ({ ...prev, state: 'error' }));
    });
    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, nonce, dataSourceName]);

  const rerun = useCallback(() => setNonce((n) => n + 1), []);

  return { meta, rerun };
}