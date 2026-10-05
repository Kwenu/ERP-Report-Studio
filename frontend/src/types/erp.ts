export type DataType =
'text' |
'integer' |
'decimal' |
'currency' |
'date' |
'datetime' |
'boolean';

export type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';

export type ColumnFormat =
'text' |
'number' |
'currency' |
'percent' |
'date' |
'boolean';

export type Align = 'left' | 'right' | 'center';

export interface ErpField {
  /** Fully qualified id, e.g. "Invoices.InvoiceDate" */
  id: string;
  table: string;
  name: string;
  displayName: string;
  dataType: DataType;
  description: string;
  example: string;
  nullable: boolean;
  reportable: boolean;
  /** Key on a dataset row, when the field carries demo data */
  key?: string;
  /** Primary key of its table */
  isKey?: boolean;
  /** Fully qualified parent field this column references, e.g. "Customers.CustomerID" */
  references?: string;
}

export interface ErpTable {
  name: string;
  description: string;
  records: number;
  lastUpdated: string;
  status: 'Active' | 'Syncing' | 'Stale';
  fields: ErpField[];
}

export interface Relationship {
  fromTable: string;
  fromField: string;
  toTable: string;
  toField: string;
}

export type Row = Record<string, string | number | boolean | null>;

export interface ReportColumn {
  id: string;
  /** Dataset key this column reads */
  key: string;
  label: string;
  dataType: DataType;
  format: ColumnFormat;
  decimals: number;
  align: Align;
  width: number;
  aggregation: Aggregation;
  visible: boolean;
  pinned: boolean;
  /** Part of the protected fixed-template structure */
  locked?: boolean;
  /** Derived column produced by the formula builder */
  formula?: string;
}

export type FilterOperator =
'is between' |
'equals' |
'not equals' |
'contains' |
'greater than' |
'less than' |
'on or after' |
'on or before' |
'is empty';

export interface FilterRule {
  id: string;
  key: string;
  label: string;
  dataType: DataType;
  operator: FilterOperator;
  value: string;
  value2?: string;
  connector: 'AND' | 'OR';
}

export interface SortRule {
  key: string;
  label: string;
  dir: 'asc' | 'desc';
}

export type DatasetId = 'salesLines' | 'paymentTxns' | 'openInvoices';

export interface CalculatedField {
  key: string;
  label: string;
  left: string;
  op: '+' | '-' | '*' | '/';
  right: string;
}

export type Visibility = 'Private' | 'Shared with Department' | 'Shared with Company';

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  owner: string;
  visibility: Visibility;
  type: 'Fixed Template' | 'Custom Report';
  /** For customized copies of a protected template */
  templateId?: string;
  dataset: DatasetId;
  subtitle?: string;
  basis?: 'Accrual' | 'Cash';
  dateFrom?: string;
  dateTo?: string;
  columns: ReportColumn[];
  calculatedFields?: CalculatedField[];
  groupBy: string | null;
  filters: FilterRule[];
  sort: SortRule[];
  showSubtotals: boolean;
  showGrandTotal: boolean;
  showRowCount: boolean;
  weightedAverage: boolean;
  headerStyle: 'bold' | 'plain';
  fontSize: 'compact' | 'normal' | 'relaxed';
  lastModified: string;
  lastRun: string;
  createdBy: string;
}

export type UserRole = 'Administrator' | 'Report Designer' | 'Report Viewer';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'Active' | 'Invited' | 'Disabled';
  lastActive: string;
}

export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  report: string;
  timestamp: string;
  dataSource?: string;
}

export type ConnectionStatus = 'Connected' | 'Disconnected' | 'Error' | 'Testing';

export interface DataSourceConnection {
  id: string;
  name: string;
  databaseType: string;
  server: string;
  port: string;
  database: string;
  authMethod: 'Windows Authentication' | 'Database Authentication';
  username: string;
  status: ConnectionStatus;
  lastSchemaRefresh: string;
  lastDataRefresh: string;
  isPrimary: boolean;
}

export type TableRefreshStatus = 'Current' | 'Stale' | 'Refreshing' | 'Queued' | 'Failed';

export interface TableRefreshState {
  table: string;
  records: number;
  lastRefresh: string;
  status: TableRefreshStatus;
}

export type RefreshMode = 'Incremental' | 'Full';

export interface RefreshSchedule {
  frequency: 'Daily' | 'Weekly' | 'Manual';
  time: string;
  timezone: string;
  scope: 'All Tables' | 'Selected Tables';
  tables: string[];
}

export type QueryState = 'idle' | 'running' | 'complete' | 'error';

export interface QueryResultMeta {
  state: QueryState;
  records: number;
  executionMs: number;
  completedAt: string;
  dataSource: string;
  /** Server error message when state === 'error' */
  error?: string;
  /** True when the dataset has more rows than the 20,000 the UI loads at once */
  truncated?: boolean;
}

export interface ScheduledReport {
  id: string;
  reportName: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  time: string;
  recipients: string[];
  format: 'Excel' | 'PDF' | 'CSV';
  nextRun: string;
  status: 'Active' | 'Paused';
}