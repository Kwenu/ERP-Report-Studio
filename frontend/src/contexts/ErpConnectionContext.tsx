import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ConnectionStatus,
  DataSourceConnection,
  RefreshSchedule,
  TableRefreshState,
  TableRefreshStatus } from
'../types/erp';
import {
  createDataSource,
  deleteDataSource,
  listDataSources,
  listSourceTables,
  setPrimaryDataSource,
  type DataRefreshResult,
  type NewDataSource,
  type SchemaRefreshResult } from
'../services/erpApi';
import { useApp } from './AppContext';

/** Shown only while no data source exists (never sent to the backend). */
const NO_SOURCE_ID = 'none';
const noSource: DataSourceConnection = {
  id: NO_SOURCE_ID,
  name: 'No data source',
  databaseType: '—',
  server: '—',
  port: '',
  database: '—',
  authMethod: 'Database Authentication',
  username: '',
  status: 'Disconnected',
  lastSchemaRefresh: '',
  lastDataRefresh: '',
  isPrimary: false
};

export interface SchemaStats {
  tables: number;
  fields: number;
  relationships: number;
  primaryKeys: number;
  foreignKeys: number;
}

interface ErpConnectionState {
  sources: DataSourceConnection[];
  activeSource: DataSourceConnection;
  setActiveSourceId: (id: string) => void;
  /** Saves the source in the backend (encrypting the password there) and returns the stored record. */
  addSource: (input: NewDataSource) => Promise<DataSourceConnection>;
  /** Deletes the connection in the backend (the ERP database itself is untouched). */
  removeSource: (id: string) => Promise<void>;
  /** Makes this source the one reports run against. */
  makePrimary: (id: string) => Promise<void>;
  /** Real table list of the active source (loaded from the ERP catalogue). */
  tablesLoading: boolean;
  tablesError: string | null;
  reloadTables: () => Promise<void>;
  setConnectionStatus: (status: ConnectionStatus, sourceId?: string) => void;
  /** True while the list is being loaded from the backend. */
  sourcesLoading: boolean;
  /** Set when the list could not be loaded (backend down / not signed in). */
  sourcesError: string | null;
  reloadSources: () => Promise<void>;
  schemaStats: SchemaStats;
  applySchemaRefresh: (result: SchemaRefreshResult) => void;
  tableStates: TableRefreshState[];
  setTableStatus: (table: string, status: TableRefreshStatus) => void;
  applyDataRefresh: (result: DataRefreshResult) => void;
  lastRefreshResult: DataRefreshResult | null;
  schedule: RefreshSchedule;
  setSchedule: (schedule: RefreshSchedule) => void;
  nextScheduledRefresh: string;
  totalRecords: number;
}

const ErpConnectionContext = createContext<ErpConnectionState | null>(null);

function computeNextRun(schedule: RefreshSchedule): string {
  if (schedule.frequency === 'Manual') return 'Manual only — no automatic refresh';
  const [hour, minute] = schedule.time.split(':').map(Number);
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  if (schedule.frequency === 'Weekly') {
    while (next.getDay() !== 1) next.setDate(next.getDate() + 1);
  }
  const label = next.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${label}, ${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function ErpConnectionProvider({ children }: {children: React.ReactNode;}) {
  const { authenticated } = useApp();
  // The bundled sample record is only a placeholder until the real list arrives from the backend.
  const [sources, setSources] = useState<DataSourceConnection[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState(NO_SOURCE_ID);
  const [tableStates, setTableStates] = useState<TableRefreshState[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [lastRefreshResult, setLastRefreshResult] = useState<DataRefreshResult | null>(null);
  const [schemaStats, setSchemaStats] = useState<SchemaStats>({
    tables: 0,
    fields: 0,
    relationships: 0,
    primaryKeys: 0,
    foreignKeys: 0
  });
  const [schedule, setSchedule] = useState<RefreshSchedule>({
    frequency: 'Daily',
    time: '06:00',
    timezone: 'Company timezone (Asia/Colombo, GMT+5:30)',
    scope: 'All Tables',
    tables: []
  });

  const activeSource =
  sources.find((s) => s.id === activeSourceId) ?? sources[0] ?? noSource;

  const reloadSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const real = await listDataSources();
      setSourcesError(null);
      if (real.length) {
        setSources(real);
        setActiveSourceId((current) => real.some((r) => r.id === current) ? current : (real.find((r) => r.isPrimary) ?? real[0]).id);
      } else {
        setSources([]);
        setActiveSourceId(NO_SOURCE_ID);
      }
    } catch (err) {
      setSourcesError(err instanceof Error ? err.message : String(err));
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  /* Real tables + row counts of the active source (replaces the old built-in sample list). */
  const lastDataRefreshRef = useRef('');
  lastDataRefreshRef.current = activeSource.lastDataRefresh;
  const loadTables = useCallback(async (sourceId: string, isStale: () => boolean = () => false) => {
    if (sourceId === NO_SOURCE_ID) {
      setTableStates([]);
      setTablesError(null);
      setSchemaStats({ tables: 0, fields: 0, relationships: 0, primaryKeys: 0, foreignKeys: 0 });
      return;
    }
    setTablesLoading(true);
    try {
      const result = await listSourceTables(sourceId);
      if (isStale()) return;
      setTablesError(null);
      setSchemaStats(result.stats);
      setTableStates(
        result.tables.map((t) => ({
          table: t.table,
          records: t.records,
          lastRefresh: lastDataRefreshRef.current,
          status: 'Current' as const
        }))
      );
    } catch (err) {
      if (isStale()) return;
      setTableStates([]);
      setTablesError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!isStale()) setTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let stale = false;
    void loadTables(activeSourceId, () => stale);
    return () => {
      stale = true;
    };
  }, [authenticated, activeSourceId, loadTables]);

  // Load the real data sources once the person is signed in (and a token exists).
  useEffect(() => {
    if (authenticated) void reloadSources();
  }, [authenticated, reloadSources]);

  const patchActive = useCallback(
    (patch: Partial<DataSourceConnection>) =>
    setSources((prev) =>
    prev.map((s) => s.id === activeSourceId ? { ...s, ...patch } : s)
    ),
    [activeSourceId]
  );

  const applySchemaRefresh = useCallback(
    (result: SchemaRefreshResult) => {
      setSchemaStats({
        tables: result.tables,
        fields: result.fields,
        relationships: result.relationships,
        primaryKeys: result.primaryKeys,
        foreignKeys: result.foreignKeys
      });
      patchActive({ lastSchemaRefresh: result.completedAt });
      void loadTables(activeSourceId);
    },
    [patchActive, loadTables, activeSourceId]
  );

  const setTableStatus = useCallback((table: string, status: TableRefreshStatus) => {
    setTableStates((prev) =>
    prev.map((t) => t.table === table ? { ...t, status } : t)
    );
  }, []);

  const applyDataRefresh = useCallback(
    (result: DataRefreshResult) => {
      setLastRefreshResult(result);
      setTableStates((prev) =>
      prev.map((t) => {
        const outcome = result.tables.find((o) => o.table === t.table);
        return outcome ?
        {
          ...t,
          records: outcome.records,
          lastRefresh: result.completedAt,
          status: 'Current' as const
        } :
        t;
      })
      );
      patchActive({ lastDataRefresh: result.completedAt });
    },
    [patchActive]
  );

  const value = useMemo<ErpConnectionState>(
    () => ({
      sources,
      activeSource,
      setActiveSourceId,
      addSource: async (input) => {
        const saved = await createDataSource(input);
        await reloadSources(); // picks up the real primary flags
        if (saved.isPrimary) setActiveSourceId(saved.id);
        return saved;
      },
      removeSource: async (id) => {
        await deleteDataSource(id);
        await reloadSources();
      },
      makePrimary: async (id) => {
        await setPrimaryDataSource(id);
        await reloadSources();
        setActiveSourceId(id);
      },
      tablesLoading,
      tablesError,
      reloadTables: () => loadTables(activeSourceId),
      setConnectionStatus: (status, sourceId) =>
      setSources((prev) => prev.map((s) => s.id === (sourceId ?? activeSourceId) ? { ...s, status } : s)),
      sourcesLoading,
      sourcesError,
      reloadSources,
      schemaStats,
      applySchemaRefresh,
      tableStates,
      setTableStatus,
      applyDataRefresh,
      lastRefreshResult,
      schedule,
      setSchedule,
      nextScheduledRefresh: computeNextRun(schedule),
      totalRecords: tableStates.reduce((sum, t) => sum + t.records, 0)
    }),
    [
    sources,
    activeSource,
    schemaStats,
    applySchemaRefresh,
    tableStates,
    setTableStatus,
    applyDataRefresh,
    lastRefreshResult,
    schedule,
    patchActive,
    activeSourceId,
    sourcesLoading,
    sourcesError,
    reloadSources,
    tablesLoading,
    tablesError,
    loadTables]

  );

  return (
    <ErpConnectionContext.Provider value={value}>{children}</ErpConnectionContext.Provider>);

}

export function useErpConnection(): ErpConnectionState {
  const ctx = useContext(ErpConnectionContext);
  if (!ctx) throw new Error('useErpConnection must be used inside ErpConnectionProvider');
  return ctx;
}