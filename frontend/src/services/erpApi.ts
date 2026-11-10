/* Drop this in src/services/erpApi.ts, REPLACING the simulated version.
 * Same exported names/shapes as before, so ConfigPanel / TestConnectionDialog /
 * RefreshSchemaDialog / DataRefreshDialog / ReportWorkspace keep working
 * without changes. The only real difference: these now call the live
 * backend instead of setTimeout()s over in-memory mock data.
 */
import type { DataSourceConnection, ErpField, ErpTable, RefreshMode, Relationship, ReportDefinition, Row } from '../types/erp';
import { allFields as sampleFields, erpTables as sampleTables } from '../data/schema';
import { http } from './http';
import { companyKeysFor, customerCodesOf, customerKeyFor, emptyScope, IN_SEPARATOR, type ReportScope } from '../utils/scope';

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

  for (const step of connectionSteps) onStep(step.id, 'running');
  const started = performance.now();

  let result: { success: boolean; message: string; latencyMs: number; steps: Array<{ id: string; status: StepStatus; detail: string }> };
  try {
    // The backend itself gives up after ~25 s; allow a little longer so its real error reaches the screen.
    result = await http(`/datasources/${source.id}/test`, { method: 'POST', timeoutMs: 45_000 });
  } catch (err) {
    // Never leave the spinners running: the request itself failed (backend down, 401, CORS, timeout...).
    const message = err instanceof Error ? err.message : String(err);
    onStep('server', 'failed', message);
    for (const id of ['auth', 'database', 'schema']) onStep(id, 'skipped', 'Not tested');
    return { success: false, message, latencyMs: Math.round(performance.now() - started) };
  }

  const reported = new Set(result.steps.map((s) => s.id));
  for (const step of result.steps) {
    onStep(step.id, step.status, step.detail);
    await wait(120);
  }
  // Steps the backend never reached (because an earlier one failed) are shown as skipped, not spinning.
  for (const step of connectionSteps) if (!reported.has(step.id)) onStep(step.id, 'skipped', 'Not tested');

  return { success: result.success, message: result.message, latencyMs: result.latencyMs };
}

/* ---------------- Data source registry (stored by the backend) ---------------- */

/** GET /datasources — the real list, with real UUIDs. */
export async function listDataSources(): Promise<DataSourceConnection[]> {
  const { dataSources } = await http<{ dataSources: Array<Record<string, any>> }>('/datasources');
  return dataSources.map(fromApi);
}

export interface NewDataSource {
  name: string;
  databaseType: string;
  server: string;
  port: string;
  database: string;
  authMethod: DataSourceConnection['authMethod'];
  username?: string;
  password?: string;
}

/** POST /datasources — the password goes to the backend vault once and is never returned. */
export async function createDataSource(input: NewDataSource): Promise<DataSourceConnection> {
  return fromApi(await http<Record<string, any>>('/datasources', { method: 'POST', body: JSON.stringify(input) }));
}

/** DELETE /datasources/:id — removes the connection and its stored password. The ERP database itself is untouched. */
export async function deleteDataSource(id: string): Promise<void> {
  await http<void>(`/datasources/${id}`, { method: 'DELETE' });
}

/** PUT /datasources/:id { isPrimary: true } — reports are always run against the primary source. */
export async function setPrimaryDataSource(id: string): Promise<void> {
  await http(`/datasources/${id}`, { method: 'PUT', body: JSON.stringify({ isPrimary: true }) });
}

export interface SourceTable {
  table: string;
  columns: number;
  records: number;
}

export interface SourceTablesResult {
  stats: { tables: number; fields: number; relationships: number; primaryKeys: number; foreignKeys: number };
  tables: SourceTable[];
}

/** GET /datasources/:id/tables — every real table in the ERP database with its row count. */
export async function listSourceTables(id: string): Promise<SourceTablesResult> {
  return http<SourceTablesResult>(`/datasources/${id}/tables`, { timeoutMs: 120_000 });
}

export interface SourceSchema {
  stats: SourceTablesResult['stats'];
  tables: ErpTable[];
  relationships: Relationship[];
  loadedAt: string;
}

const sampleById = new Map<string, ErpField>(sampleFields.map((f) => [f.id.toLowerCase(), f]));
const sampleTableByName = new Map<string, ErpTable>(sampleTables.map((t) => [t.name.toLowerCase(), t]));

/**
 * GET /datasources/:id/schema — every table and column discovered in the ERP database.
 * Fields that also exist in the built-in report datasets keep their friendly name / dataset key,
 * so existing reports and the builder keep working; everything else is shown exactly as discovered.
 */
export async function getSourceSchema(id: string, refresh = false): Promise<SourceSchema> {
  const raw = await http<{
    stats: SourceTablesResult['stats'];
    tables: Array<{ name: string; description?: string; records?: number; fields: Array<Record<string, any>> }>;
    relationships: Relationship[];
    loadedAt: string;
  }>(`/datasources/${id}/schema${refresh ? '?refresh=true' : ''}`, { timeoutMs: 120_000 });

  const tables: ErpTable[] = raw.tables.map((t) => ({
    name: t.name,
    description: t.description || sampleTableByName.get(t.name.toLowerCase())?.description || '',
    records: t.records ?? 0,
    lastUpdated: raw.loadedAt,
    status: 'Active' as const,
    fields: t.fields.map((f) => {
      const known = sampleById.get(String(f.id).toLowerCase());
      return {
        id: f.id,
        table: t.name,
        name: f.name,
        displayName: known?.displayName ?? f.displayName ?? f.name,
        dataType: f.dataType,
        description: known?.description || f.description || '',
        example: known?.example ?? '',
        nullable: Boolean(f.nullable),
        reportable: f.reportable !== false,
        key: known?.key,
        isKey: Boolean(f.isKey),
        references: f.references ?? undefined
      } as ErpField;
    })
  }));

  return { stats: raw.stats, tables, relationships: raw.relationships ?? [], loadedAt: raw.loadedAt };
}

function fromApi(row: Record<string, any>): DataSourceConnection {
  return {
    id: row.id,
    name: row.name,
    databaseType: row.databaseType,
    server: row.server,
    port: String(row.port),
    database: row.database,
    authMethod: row.authMethod,
    username: row.username ?? '',
    status: row.status,
    lastSchemaRefresh: row.lastSchemaRefresh ?? '',
    lastDataRefresh: row.lastDataRefresh ?? '',
    isPrimary: Boolean(row.isPrimary)
  };
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
    method: 'POST',
    timeoutMs: 120_000
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
    { method: 'POST', body: JSON.stringify({ tables, mode }), timeoutMs: 300_000 }
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


/**
 * Loads the raw dataset rows for a report from the real database (via the backend).
 * Only the date range is applied server-side; filters, grouping, sorting and totals are
 * then computed in the browser by the existing report engine, exactly as before.
 */
export async function fetchDatasetRows(
  definition: Pick<ReportDefinition, 'dataset' | 'dateFrom' | 'dateTo' | 'filters'>,
  /** Manufacturing / Inventory Quick Report only: limit the rows to ONE transaction type ('' / undefined = all types). */
  typeFilter?: string,
  /** The Customer / Company drop-downs of the controls bar ('' = all). */
  scope: ReportScope = emptyScope,
  /** "Search within report": matched by the DATABASE against every column of the dataset, over the whole period. */
  search = ''
): Promise<QueryResponse & { truncated: boolean }> {
  const result = await http<QueryResponse>('/reports/query', {
    method: 'POST',
    body: JSON.stringify({
      dataset: definition.dataset,
      columns: [], // empty = every column of the dataset
      filters: datasetFilters(definition, typeFilter, scope),
      sort: [],
      dateFrom: definition.dateFrom || undefined,
      dateTo: definition.dateTo || undefined,
      search: search.trim() || undefined,
      pageSize: 20000
    })
  });
  return { ...result, truncated: result.records > result.rows.length };
}

type ServerFilter = { key: string; operator: 'equals' | 'is one of'; value: string; connector: 'AND' | 'OR' };

/**
 * The filters the DATABASE applies (everything else - the Filters panel, search box, grouping - is applied in the browser).
 *  - AR customer details: the selected customer(s) (by code), so only their documents are read.
 *  - Manufacturing / Inventory Quick: the Type drop-down.
 *  - Customer / Company drop-downs of the reports that offer them.
 * The filters are combined left to right, so the Company pair (From OR To) goes first: ((from OR to) AND type) AND customer.
 */
function datasetFilters(
  definition: Pick<ReportDefinition, 'dataset' | 'filters'>,
  typeFilter: string | undefined,
  scope: ReportScope
): ServerFilter[] {
  if (definition.dataset === 'arTransactions') {
    // One customer, or several selected in the AR Report: only those customers' documents are read.
    const codes = [...new Set(customerCodesOf(definition.filters ?? []))];
    if (codes.length === 0) return [];
    return codes.length === 1 ?
    [{ key: 'customerId', operator: 'equals' as const, value: codes[0], connector: 'AND' as const }] :
    [{ key: 'customerId', operator: 'is one of' as const, value: codes.join(IN_SEPARATOR), connector: 'AND' as const }];
  }

  const out: ServerFilter[] = [];
  const companyKeys = companyKeysFor(definition.dataset);
  if (scope.company && companyKeys.length) {
    companyKeys.forEach((key, i) => out.push({ key, operator: 'equals', value: scope.company, connector: i === 0 ? 'AND' : 'OR' }));
  }
  if ((definition.dataset === 'mfgQuick' || definition.dataset === 'inventoryQuick') && typeFilter) {
    out.push({ key: 'type', operator: 'equals', value: typeFilter, connector: 'AND' });
  }
  const customerKey = customerKeyFor(definition.dataset);
  if (scope.customer && customerKey) {
    out.push({ key: customerKey, operator: 'equals', value: scope.customer, connector: 'AND' });
  }
  return out;
}

/**
 * The values offered by the Customer and Company drop-downs: every distinct customer / company found in the period
 * (read from the whole period in the database). A list that cannot be read (for example the Inventory Quick view has
 * not been rebuilt yet) is simply empty.
 */
export async function fetchScopeOptions(
  definition: Pick<ReportDefinition, 'dataset' | 'dateFrom' | 'dateTo' | 'hidePeriod'>
): Promise<{ customers: string[]; companies: string[] }> {
  // The AR summary is a balance "as at today" and has no date column to filter on.
  const noDates = definition.hidePeriod || definition.dataset === 'arSummary';
  const from = noDates ? undefined : definition.dateFrom;
  const to = noDates ? undefined : definition.dateTo;

  const customerKey = customerKeyFor(definition.dataset);
  const companyKeys = companyKeysFor(definition.dataset);

  const safe = (column: string) => fetchDistinctValues(definition.dataset, column, from, to).catch(() => [] as string[]);

  const [customers, ...companyLists] = await Promise.all([
    customerKey ? safe(customerKey) : Promise.resolve([] as string[]),
    ...companyKeys.map((key) => safe(key))]
  );
  const companies = [...new Set(companyLists.flat())].sort((a, b) => a.localeCompare(b));
  return { customers, companies };
}


/** POST /datasources/:id/table-rows — the rows of one real ERP table (only the columns the report uses). */
export async function fetchTableRows(
  sourceId: string,
  table: string,
  columns: string[]
): Promise<{ rows: Row[]; records: number; executionMs: number; completedAt: string; truncated: boolean }> {
  return http(`/datasources/${sourceId}/table-rows`, {
    method: 'POST',
    body: JSON.stringify({ table, columns, limit: 20000 }),
    timeoutMs: 120_000
  });
}


/** POST /reports/distinct-values — every distinct value of one dataset column in the period (e.g. all Types). */
export async function fetchDistinctValues(
  dataset: ReportDefinition['dataset'],
  column: string,
  dateFrom?: string,
  dateTo?: string
): Promise<string[]> {
  const result = await http<{ values: string[] }>('/reports/distinct-values', {
    method: 'POST',
    body: JSON.stringify({ dataset, column, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
  });
  return result.values;
}
