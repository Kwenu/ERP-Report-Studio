/* Drop this in src/services/erpApi.ts, REPLACING the simulated version.
 * Same exported names/shapes as before, so ConfigPanel / TestConnectionDialog /
 * RefreshSchemaDialog / DataRefreshDialog / ReportWorkspace keep working
 * without changes. The only real difference: these now call the live
 * backend instead of setTimeout()s over in-memory mock data.
 */
import type { DataSourceConnection, RefreshMode, ReportDefinition, Row } from '../types/erp';
import { http } from './http';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1') as string;

export const architectureLayers = [
  { id: 'erp', label: 'Existing ERP Database', detail: 'Your customer\u2019s SQL Server / Postgres / MySQL' },
  { id: 'api', label: 'Secure Backend / API', detail: 'Token auth \u00b7 credentials in vault' },
  { id: 'connector', label: 'Database Connector', detail: 'Pooled read-only connection' },
  { id: 'metadata', label: 'Schema / Metadata Service', detail: 'Tables, fields, keys, relationships' },
  { id: 'engine', label: 'Report Query Engine', detail: 'Structured definition \u2192 parameterized SQL' },
  { id: 'studio', label: 'ERP Report Studio', detail: 'This application' }
];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface ProgressStep {
  id: string;
  label: string;
  runningLabel: string;
  status: StepStatus;
  detail?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs: number;
}

export const connectionSteps: ProgressStep[] = [
  { id: 'server', label: 'Server reachable', runningLabel: 'Testing server\u2026', status: 'pending' },
  { id: 'auth', label: 'Authentication successful', runningLabel: 'Testing authentication\u2026', status: 'pending' },
  { id: 'database', label: 'Database found', runningLabel: 'Checking database\u2026', status: 'pending' },
  { id: 'schema', label: 'Schema accessible', runningLabel: 'Checking schema access\u2026', status: 'pending' }
];

/** POST {API_BASE}/datasources/:id/test — real connectivity check run by the backend. */
export async function testConnection(
  source: Pick<DataSourceConnection, 'server' | 'database' | 'authMethod'> & { id?: string },
  onStep: (stepId: string, status: StepStatus, detail?: string) => void
): Promise<TestConnectionResult> {
  if (!source.id) throw new Error('Save the data source before testing the connection.');

  // Show each step as "running" briefly before the real result lands, so the
  // UI's step-by-step animation still feels alive even though the backend
  // resolves everything in one round trip.
  for (const step of connectionSteps) onStep(step.id, 'running');

  const result = await http<{ success: boolean; message: string; latencyMs: number; steps: Array<{ id: string; status: StepStatus; detail: string }> }>(
    `/datasources/${source.id}/test`,
    { method: 'POST' }
  );

  for (const step of result.steps) {
    onStep(step.id, step.status, step.detail);
    await wait(120);
  }

  return { success: result.success, message: result.message, latencyMs: result.latencyMs };
}

export interface SchemaRefreshResult {
  tables: number;
  fields: number;
  relationships: number;
  primaryKeys: number;
  foreignKeys: number;
  completedAt: string;
  durationMs: number;
}

export const schemaSteps: ProgressStep[] = [
  { id: 'tables', label: 'Tables discovered', runningLabel: 'Discovering tables\u2026', status: 'pending' },
  { id: 'fields', label: 'Fields discovered', runningLabel: 'Discovering fields\u2026', status: 'pending' },
  { id: 'relationships', label: 'Relationships mapped', runningLabel: 'Discovering relationships\u2026', status: 'pending' }
];

/** POST {API_BASE}/datasources/:id/schema/refresh */
export async function refreshSchema(
  dataSourceId: string,
  onStep: (stepId: string, status: StepStatus, detail?: string) => void
): Promise<SchemaRefreshResult> {
  const started = performance.now();
  for (const step of schemaSteps) onStep(step.id, 'running');

  const result = await http<Omit<SchemaRefreshResult, 'durationMs'>>(`/datasources/${dataSourceId}/schema/refresh`, {
    method: 'POST'
  });

  onStep('tables', 'passed', `${result.tables} tables found`);
  onStep('fields', 'passed', `${result.fields} reportable fields found`);
  onStep('relationships', 'passed', `${result.relationships} relationships found`);

  return { ...result, durationMs: Math.round(performance.now() - started) };
}

export interface TableRefreshOutcome {
  table: string;
  recordsUpdated: number;
  records: number;
}

export interface DataRefreshResult {
  recordsUpdated: number;
  durationMs: number;
  completedAt: string;
  tables: TableRefreshOutcome[];
  mode: RefreshMode;
}

/** POST {API_BASE}/datasources/:id/data/refresh */
export async function refreshData(
  dataSourceId: string,
  tables: string[],
  mode: RefreshMode,
  onTable: (table: string, status: 'refreshing' | 'done', outcome?: TableRefreshOutcome) => void
): Promise<DataRefreshResult> {
  const started = performance.now();
  tables.forEach((t) => onTable(t, 'refreshing'));

  const result = await http<{ completedAt: string; tables: Array<{ table: string; records: number }> }>(
    `/datasources/${dataSourceId}/data/refresh`,
    { method: 'POST', body: JSON.stringify({ tables, mode }) }
  );

  const outcomes: TableRefreshOutcome[] = result.tables.map((t) => ({
    table: t.table,
    recordsUpdated: t.records,
    records: t.records
  }));
  outcomes.forEach((o) => onTable(o.table, 'done', o));

  return {
    recordsUpdated: outcomes.reduce((sum, o) => sum + o.recordsUpdated, 0),
    durationMs: Math.round(performance.now() - started),
    completedAt: result.completedAt,
    tables: outcomes,
    mode
  };
}

export interface QueryResponse {
  rows: Row[];
  records: number;
  executionMs: number;
  completedAt: string;
  queryDefinition: unknown;
}

/** POST {API_BASE}/reports/query — runs against the real database via the backend's query engine. */
export async function runQuery(definition: ReportDefinition, signal?: { cancelled: boolean }): Promise<QueryResponse> {
  const payload = {
    dataset: definition.dataset,
    reportId: definition.type === 'Fixed Template' || definition.id ? definition.id : undefined,
    columns: definition.columns
      .filter((c) => c.visible)
      .map((c) => ({ key: c.key, aggregation: c.aggregation })),
    filters: definition.filters.map((f) => ({
      key: f.key,
      operator: f.operator,
      value: f.value,
      value2: f.value2,
      connector: f.connector
    })),
    sort: definition.sort.map((s) => ({ key: s.key, dir: s.dir })),
    groupBy: definition.groupBy,
    dateFrom: definition.dateFrom,
    dateTo: definition.dateTo
  };

  const result = await http<QueryResponse>('/reports/query', { method: 'POST', body: JSON.stringify(payload) });
  if (signal?.cancelled) throw new Error('cancelled');
  return result;
}
