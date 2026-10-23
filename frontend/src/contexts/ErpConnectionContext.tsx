import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ConnectionStatus,
  DataSourceConnection,
  ErpField,
  ErpTable,
  RefreshSchedule,
  Relationship,
  TableRefreshState,
  TableRefreshStatus } from
'../types/erp';
import {
  createDataSource,
  deleteDataSource,
  listDataSources,
  getSourceSchema,
  listSourceTables,
  refreshData,
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
  /** Live schema (every table + column + relationship) of the active source. */
  schemaTables: ErpTable[];
  schemaFields: ErpField[];
  schemaRelationships: Relationship[];
  schemaLoading: boolean;
  schemaError: string | null;
  /** Re-reads the schema from the backend; force = re-introspect the ERP instead of the server cache. */
  reloadSchema: (force?: boolean) => Promise<void>;
  findSchemaField: (id: string) => ErpField | undefined;
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
  /** Outcome of the last refresh the schedule ran by itself (null until one has run in this browser session). */
  lastAutoRefresh: AutoRefreshOutcome | null;
  totalRecords: number;
}

export interface AutoRefreshOutcome {
  at: string;
  ok: boolean;
  tables: number;
  records: number;
  error?: string;
}

const ErpConnectionContext = createContext<ErpConnectionState | null>(null);

const SCHEDULE_KEY = 'erp-studio:refresh-schedule';
const LAST_AUTO_KEY = 'erp-studio:refresh-last-auto';
const DEFAULT_SCHEDULE: RefreshSchedule = {
  frequency: 'Daily',
  time: '06:00',
  timezone: 'Company timezone (Asia/Colombo, GMT+5:30)',
  scope: 'All Tables',
  tables: []
};

function readStoredSchedule(): RefreshSchedule {
  try {
    const raw = window.localStorage.getItem(SCHEDULE_KEY);
    return raw ? { ...DEFAULT_SCHEDULE, ...(JSON.parse(raw) as Partial<RefreshSchedule>) } : DEFAULT_SCHEDULE;
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

/** When the schedule last came due (the latest daily / weekly slot that is not in the future), or null for Manual. */
function lastDueTime(schedule: RefreshSchedule, nowMs: number): number | null {
  if (schedule.frequency === 'Manual') return null;
  const [hour, minute] = schedule.time.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  const due = new Date(nowMs);
  due.setHours(hour, minute, 0, 0);
  if (due.getTime() > nowMs) due.setDate(due.getDate() - 1);
  if (schedule.frequency === 'Weekly') {
    while (due.getDay() !== 1) due.setDate(due.getDate() - 1);
  }
  return due.getTime();
}

function computeNextRun(schedule: RefreshSchedule, from: Date = new Date()): string {
  if (schedule.frequency === 'Manual') return 'Manual only — no automatic refresh';
  const [hour, minute] = schedule.time.split(':').map(Number);
  const next = new Date(from);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= from.getTime()) next.setDate(next.getDate() + 1);
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
  const { authenticated, logAction } = useApp();
  // The bundled sample record is only a placeholder until the real list arrives from the backend.
  const [sources, setSources] = useState<DataSourceConnection[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState(NO_SOURCE_ID);
  const [tableStates, setTableStates] = useState<TableRefreshState[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [liveTables, setLiveTables] = useState<ErpTable[]>([]);
  const [schemaRelationships, setSchemaRelationships] = useState<Relationship[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [lastRefreshResult, setLastRefreshResult] = useState<DataRefreshResult | null>(null);
  const [schemaStats, setSchemaStats] = useState<SchemaStats>({
    tables: 0,
    fields: 0,
    relationships: 0,
    primaryKeys: 0,
    foreignKeys: 0
  });
  const [schedule, setScheduleState] = useState<RefreshSchedule>(readStoredSchedule);
  const [lastAutoRefresh, setLastAutoRefresh] = useState<AutoRefreshOutcome | null>(null);

  // A clock that ticks every 30 s: it keeps "Next scheduled refresh" correct and lets the schedule fire on time.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // When the schedule last ran in this browser. A fresh browser starts from "now", so it does not fire straight away.
  const lastAutoRunRef = useRef<number>(0);
  if (!lastAutoRunRef.current) {
    let stored = 0;
    try {
      stored = Number(window.localStorage.getItem(LAST_AUTO_KEY)) || 0;
    } catch {
      /* ignore */
    }
    lastAutoRunRef.current = stored || Date.now();
  }
  const markAutoRun = useCallback((ms: number) => {
    lastAutoRunRef.current = ms;
    try {
      window.localStorage.setItem(LAST_AUTO_KEY, String(ms));
    } catch {
      /* ignore */
    }
  }, []);

  const setSchedule = useCallback(
    (next: RefreshSchedule) => {
      setScheduleState(next);
      try {
        window.localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      markAutoRun(Date.now()); // a newly saved schedule first fires at its next slot
    },
    [markAutoRun]
  );

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

  /* Full live schema (all tables + all fields + relationships) of the active source. */
  const schemaRequest = useRef(0);
  const loadSchema = useCallback(async (sourceId: string, force = false) => {
    const ticket = ++schemaRequest.current;
    if (sourceId === NO_SOURCE_ID) {
      setLiveTables([]);
      setSchemaRelationships([]);
      setSchemaError(null);
      setSchemaLoading(false);
      return;
    }
    setSchemaLoading(true);
    try {
      const result = await getSourceSchema(sourceId, force);
      if (ticket !== schemaRequest.current) return; // a newer request superseded this one
      setSchemaError(null);
      setLiveTables(result.tables);
      setSchemaRelationships(result.relationships);
      setSchemaStats(result.stats);
    } catch (err) {
      if (ticket !== schemaRequest.current) return;
      setSchemaError(err instanceof Error ? err.message : String(err));
    } finally {
      if (ticket === schemaRequest.current) setSchemaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    void loadSchema(activeSourceId);
  }, [authenticated, activeSourceId, loadSchema]);

  // Row counts shown with each table follow the data-refresh results.
  const schemaTables = useMemo(() => {
    if (!tableStates.length) return liveTables;
    const records = new Map(tableStates.map((t) => [t.table, t.records]));
    return liveTables.map((t) => records.has(t.name) ? { ...t, records: records.get(t.name)! } : t);
  }, [liveTables, tableStates]);
  const schemaFields = useMemo(() => schemaTables.flatMap((t) => t.fields), [schemaTables]);
  const fieldIndex = useMemo(() => new Map(schemaFields.map((f) => [f.id, f])), [schemaFields]);
  const findSchemaField = useCallback((id: string) => fieldIndex.get(id), [fieldIndex]);

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
      void loadSchema(activeSourceId);
    },
    [patchActive, loadTables, loadSchema, activeSourceId]
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

  /* The schedule runs for real: when its slot has come (and the app is open) the selected tables are refreshed,
   * the "Last Data Refresh" time and the table list are updated and the run is written to the audit log. */
  const autoRunning = useRef(false);
  useEffect(() => {
    if (!authenticated || activeSourceId === NO_SOURCE_ID || autoRunning.current) return;
    const due = lastDueTime(schedule, clock);
    if (due === null || lastAutoRunRef.current >= due) return;
    const tables = schedule.scope === 'Selected Tables' && schedule.tables.length ?
    schedule.tables :
    tableStates.map((t) => t.table);
    if (!tables.length) return; // the table list has not loaded yet - try again on the next tick

    autoRunning.current = true;
    const sourceId = activeSourceId;
    const sourceName = activeSource.name;
    void (async () => {
      try {
        const result = await refreshData(sourceId, tables, 'Incremental', () => undefined);
        applyDataRefresh(result);
        setLastAutoRefresh({ at: result.completedAt, ok: true, tables: result.tables.length, records: result.recordsUpdated });
        logAction(
          `Scheduled data refresh completed — ${result.recordsUpdated.toLocaleString()} records across ${result.tables.length} tables`,
          '—',
          sourceName
        );
      } catch (err) {
        setLastAutoRefresh({
          at: new Date().toISOString(),
          ok: false,
          tables: tables.length,
          records: 0,
          error: err instanceof Error ? err.message : String(err)
        });
      } finally {
        markAutoRun(Date.now()); // a failed run is retried at the next slot, not every 30 seconds
        autoRunning.current = false;
      }
    })();
  }, [clock, authenticated, activeSourceId, activeSource.name, schedule, tableStates, applyDataRefresh, logAction, markAutoRun]);

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
      schemaTables,
      schemaFields,
      schemaRelationships,
      schemaLoading,
      schemaError,
      reloadSchema: (force = false) => loadSchema(activeSourceId, force),
      findSchemaField,
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
      nextScheduledRefresh: computeNextRun(schedule, new Date(clock)),
      lastAutoRefresh,
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
    setSchedule,
    clock,
    lastAutoRefresh,
    patchActive,
    activeSourceId,
    sourcesLoading,
    sourcesError,
    reloadSources,
    tablesLoading,
    tablesError,
    loadTables,
    schemaTables,
    schemaFields,
    schemaRelationships,
    schemaLoading,
    schemaError,
    loadSchema,
    findSchemaField]

  );

  return (
    <ErpConnectionContext.Provider value={value}>{children}</ErpConnectionContext.Provider>);

}

export function useErpConnection(): ErpConnectionState {
  const ctx = useContext(ErpConnectionContext);
  if (!ctx) throw new Error('useErpConnection must be used inside ErpConnectionProvider');
  return ctx;
}