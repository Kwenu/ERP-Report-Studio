import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type {
  ConnectionStatus,
  DataSourceConnection,
  RefreshSchedule,
  TableRefreshState,
  TableRefreshStatus } from
'../types/erp';
import { erpTables, totalFieldCount, totalRelationshipCount, totalTableCount } from '../data/schema';
import type { DataRefreshResult, SchemaRefreshResult } from '../services/erpApi';

const SEED_SCHEMA_REFRESH = '2026-09-09T05:45:00';
const SEED_DATA_REFRESH = '2026-09-09T06:15:00';

const primarySource: DataSourceConnection = {
  id: 'ds-erp-prod',
  name: 'ERP Production Database',
  databaseType: 'SQL Server',
  server: 'ERP-SERVER',
  port: '1433',
  database: 'PolydimeERP',
  authMethod: 'Windows Authentication',
  username: 'POLYDIME\\svc_reporting',
  status: 'Connected',
  lastSchemaRefresh: SEED_SCHEMA_REFRESH,
  lastDataRefresh: SEED_DATA_REFRESH,
  isPrimary: true
};

const staleTables = ['PurchaseOrders', 'PurchaseOrderLines'];

function seedTableStates(): TableRefreshState[] {
  return erpTables.map((table) => ({
    table: table.name,
    records: table.records,
    lastRefresh: staleTables.includes(table.name) ?
    '2026-09-06T11:30:00' :
    table.name === 'Inventory' ?
    '2026-09-09T04:00:00' :
    SEED_DATA_REFRESH,
    status: staleTables.includes(table.name) ? 'Stale' : 'Current'
  }));
}

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
  addSource: (source: DataSourceConnection) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
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
  const [sources, setSources] = useState<DataSourceConnection[]>([primarySource]);
  const [activeSourceId, setActiveSourceId] = useState(primarySource.id);
  const [tableStates, setTableStates] = useState<TableRefreshState[]>(seedTableStates);
  const [lastRefreshResult, setLastRefreshResult] = useState<DataRefreshResult | null>(null);
  const [schemaStats, setSchemaStats] = useState<SchemaStats>({
    tables: totalTableCount,
    fields: totalFieldCount,
    relationships: totalRelationshipCount,
    primaryKeys: erpTables.filter((t) => t.fields.some((f) => f.isKey)).length,
    foreignKeys: erpTables.reduce(
      (sum, t) => sum + t.fields.filter((f) => f.references).length,
      0
    )
  });
  const [schedule, setSchedule] = useState<RefreshSchedule>({
    frequency: 'Daily',
    time: '06:00',
    timezone: 'Company timezone (Asia/Colombo, GMT+5:30)',
    scope: 'All Tables',
    tables: []
  });

  const activeSource =
  sources.find((s) => s.id === activeSourceId) ?? sources[0] ?? primarySource;

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
    },
    [patchActive]
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
      addSource: (source) => setSources((prev) => [...prev, source]),
      setConnectionStatus: (status) => patchActive({ status }),
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
    patchActive]

  );

  return (
    <ErpConnectionContext.Provider value={value}>{children}</ErpConnectionContext.Provider>);

}

export function useErpConnection(): ErpConnectionState {
  const ctx = useContext(ErpConnectionContext);
  if (!ctx) throw new Error('useErpConnection must be used inside ErpConnectionProvider');
  return ctx;
}