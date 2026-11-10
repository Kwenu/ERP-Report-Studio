import { useCallback, useEffect, useState } from 'react';
import type { QueryResultMeta, ReportDefinition, Row } from '../types/erp';
import { fetchDatasetRows, fetchDistinctValues, fetchScopeOptions, fetchTableRows } from '../services/erpApi';
import { useErpConnection } from '../contexts/ErpConnectionContext';
import { customerCodesOf, emptyScope, hasCompanyFilter, hasCustomerFilter, type ReportScope } from '../utils/scope';

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
export function useErpQuery(definition: ReportDefinition, dataSourceName: string, typeFilter = '', scope: ReportScope = emptyScope, search = '') {
  const { activeSource } = useErpConnection();
  const [loaded, setLoaded] = useState<{ key: string; rows: Row[] } | null>(null);
  const [meta, setMeta] = useState<QueryResultMeta>({
    state: 'idle',
    records: 0,
    executionMs: 0,
    completedAt: new Date().toISOString(),
    dataSource: dataSourceName
  });
  const [nonce, setNonce] = useState(0);

  const isTable = definition.dataset === 'erpTable';
  /** The customer(s) an AR details report is limited to — changing them reloads the data. */
  const customerKey = definition.dataset === 'arTransactions' ?
  customerCodesOf(definition.filters).join('|') :
  '';
  /** Dataset reports search in the database (every column, the whole period); Report Builder table reports search in the browser. */
  const serverSearch = isTable ? '' : search.trim();
  const tableColumns = isTable ? neededKeys(definition).join(SEP) : '';
  /** Which report these rows belong to: rows loaded for another dataset / table are never shown under this one. */
  const dataKey = `${definition.dataset}|${definition.sourceTable ?? ''}|${tableColumns}`;

  useEffect(() => {
    let cancelled = false;

    if (isTable && (!definition.sourceTable || !tableColumns)) {
      // Nothing to read yet: the report has no fields.
      setLoaded({ key: dataKey, rows: [] });
      setMeta({ state: 'complete', records: 0, executionMs: 0, completedAt: new Date().toISOString(), dataSource: dataSourceName });
      return undefined;
    }

    setMeta((prev) => ({ ...prev, state: 'running', error: undefined, dataSource: dataSourceName }));
    const request = isTable ?
    activeSource.id === 'none' ?
    Promise.reject(new Error('No data source is connected. Add one on the Data Sources page.')) :
    fetchTableRows(activeSource.id, definition.sourceTable as string, tableColumns.split(SEP)) :
    fetchDatasetRows(definition, typeFilter, scope, serverSearch);

    request.
    then((response) => {
      if (cancelled) return;
      setLoaded({ key: dataKey, rows: response.rows as Row[] });
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
      setLoaded({ key: dataKey, rows: [] });
      setMeta((prev) => ({ ...prev, state: 'error', error: err.message }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition.dataset, definition.sourceTable, tableColumns, definition.dateFrom, definition.dateTo, customerKey, typeFilter, scope.customer, scope.company, serverSearch, nonce, dataSourceName, activeSource.id]);

  const rerun = useCallback(() => setNonce((n) => n + 1), []);

  // Until this report's own rows arrive the table is empty (not showing the previous report's rows).
  const rows = loaded && loaded.key === dataKey ? loaded.rows : null;

  return { meta, rerun, rows };
}

/**
 * The Manufacturing / Inventory Quick Report's "Type" drop-down: every distinct transaction type found in the period
 * (read from the whole period in the database, so the list is complete even when the rows are truncated).
 * Other reports get an empty list. Reloads when the period or the data source changes, or Refresh is pressed.
 */
export function useTypeOptions(definition: ReportDefinition, refreshKey: unknown) {
  const { activeSource } = useErpConnection();
  const [options, setOptions] = useState<string[]>([]);
  /** The period the current `options` were loaded for (so callers know when the list is up to date). */
  const [loadedFor, setLoadedFor] = useState('');
  const enabled = definition.dataset === 'mfgQuick' || definition.dataset === 'inventoryQuick';
  const periodKey = `${definition.dateFrom ?? ''}|${definition.dateTo ?? ''}`;

  useEffect(() => {
    if (!enabled) {
      setOptions([]);
      return undefined;
    }
    let cancelled = false;
    fetchDistinctValues(definition.dataset, 'type', definition.dateFrom, definition.dateTo).
    then((values) => {
      if (cancelled) return;
      setOptions(values);
      setLoadedFor(periodKey);
    }).
    catch(() => {
      // Not fatal: the report itself still loads; the drop-down just offers "All types".
      if (!cancelled) setOptions([]);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, definition.dataset, periodKey, activeSource.id, refreshKey]);

  return { options, upToDate: loadedFor === periodKey };
}


/**
 * The Customer and Company drop-downs of the report controls: the customers / companies found in the period.
 * `customersReady` / `companiesReady` tell the caller when the lists belong to the current period, so a chosen value
 * that has no documents in a newly picked period can fall back to "All".
 */
export function useScopeOptions(definition: ReportDefinition, refreshKey: unknown) {
  const { activeSource } = useErpConnection();
  const [customers, setCustomers] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loadedFor, setLoadedFor] = useState('');
  const enabled = hasCustomerFilter(definition.dataset) || hasCompanyFilter(definition.dataset);
  const periodKey = `${definition.dataset}|${definition.dateFrom ?? ''}|${definition.dateTo ?? ''}`;

  useEffect(() => {
    if (!enabled) {
      setCustomers([]);
      setCompanies([]);
      return undefined;
    }
    let cancelled = false;
    fetchScopeOptions(definition).
    then((result) => {
      if (cancelled) return;
      setCustomers(result.customers);
      setCompanies(result.companies);
      setLoadedFor(periodKey);
    }).
    catch(() => {
      if (!cancelled) {
        setCustomers([]);
        setCompanies([]);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, periodKey, activeSource.id, refreshKey]);

  return { customers, companies, upToDate: loadedFor === periodKey };
}
