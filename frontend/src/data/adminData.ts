import type { AppUser, AuditEntry, ScheduledReport, UserRole } from '../types/erp';

export const users: AppUser[] = [
{
  id: 'u-1',
  name: 'Chamila Perera',
  email: 'chamila.perera@polydime.lk',
  role: 'Report Designer',
  department: 'Finance',
  status: 'Active',
  lastActive: '2026-09-08T07:42:00Z'
},
{
  id: 'u-2',
  name: 'Ruwan Jayasuriya',
  email: 'ruwan.j@polydime.lk',
  role: 'Administrator',
  department: 'IT',
  status: 'Active',
  lastActive: '2026-09-08T06:12:00Z'
},
{
  id: 'u-3',
  name: 'Nayomika Silva',
  email: 'nayomika.s@polydime.lk',
  role: 'Report Viewer',
  department: 'Sales',
  status: 'Active',
  lastActive: '2026-09-07T16:20:00Z'
},
{
  id: 'u-4',
  name: 'Fredrick Rajapakse',
  email: 'fredrick.r@polydime.lk',
  role: 'Report Designer',
  department: 'Sales',
  status: 'Active',
  lastActive: '2026-09-07T11:05:00Z'
},
{
  id: 'u-5',
  name: 'Dilani Gunawardena',
  email: 'dilani.g@polydime.lk',
  role: 'Report Viewer',
  department: 'Accounts Receivable',
  status: 'Invited',
  lastActive: '2026-09-04T09:00:00Z'
},
{
  id: 'u-6',
  name: 'Ishan Fernando',
  email: 'ishan.f@polydime.lk',
  role: 'Report Viewer',
  department: 'Sales',
  status: 'Disabled',
  lastActive: '2026-07-28T13:44:00Z'
}];


export interface PermissionMatrixRow {
  capability: string;
  Administrator: boolean;
  'Report Designer': boolean;
  'Report Viewer': boolean;
}

export const permissionMatrix: PermissionMatrixRow[] = [
{ capability: 'View reports', Administrator: true, 'Report Designer': true, 'Report Viewer': true },
{ capability: 'Apply filters & date ranges', Administrator: true, 'Report Designer': true, 'Report Viewer': true },
{ capability: 'Export reports', Administrator: true, 'Report Designer': true, 'Report Viewer': true },
{ capability: 'Create custom reports', Administrator: true, 'Report Designer': true, 'Report Viewer': false },
{ capability: 'Add fields to fixed templates', Administrator: true, 'Report Designer': true, 'Report Viewer': false },
{ capability: 'Save & share reports', Administrator: true, 'Report Designer': true, 'Report Viewer': false },
{ capability: 'Schedule reports', Administrator: true, 'Report Designer': true, 'Report Viewer': false },
{ capability: 'Manage data sources', Administrator: true, 'Report Designer': false, 'Report Viewer': false },
{ capability: 'Manage tables & field catalogue', Administrator: true, 'Report Designer': false, 'Report Viewer': false },
{ capability: 'Manage users & permissions', Administrator: true, 'Report Designer': false, 'Report Viewer': false },
{ capability: 'View audit log', Administrator: true, 'Report Designer': false, 'Report Viewer': false }];


export const roleSummaries: {role: UserRole;description: string;members: number;}[] = [
{
  role: 'Administrator',
  description: 'Full control over data sources, catalogue, users, permissions and audit.',
  members: 3
},
{
  role: 'Report Designer',
  description: 'Builds and shares reports, adds ERP fields, schedules distribution.',
  members: 14
},
{
  role: 'Report Viewer',
  description: 'Runs shared reports, applies filters, exports where permitted.',
  members: 62
}];


const ERP = 'ERP Production Database';

export const auditLog: AuditEntry[] = [
{ id: 'a-1', user: 'Chamila Perera', action: 'Report exported (Excel)', report: 'Open Invoices', dataSource: ERP, timestamp: '2026-09-09T07:44:00Z' },
{ id: 'a-2', user: 'Chamila Perera', action: 'Field added — "Sales Representative"', report: 'Sales by Customer Detail', dataSource: ERP, timestamp: '2026-09-09T07:31:00Z' },
{ id: 'a-3', user: 'Ruwan Jayasuriya', action: 'ERP data refreshed (Incremental) — 18,425 records', report: '—', dataSource: ERP, timestamp: '2026-09-09T06:15:00Z' },
{ id: 'a-4', user: 'Ruwan Jayasuriya', action: 'Schema refreshed — 17 tables, 96 fields, 23 relationships', report: '—', dataSource: ERP, timestamp: '2026-09-09T05:45:00Z' },
{ id: 'a-5', user: 'Ruwan Jayasuriya', action: 'Database connection tested — successful', report: '—', dataSource: ERP, timestamp: '2026-09-09T05:42:00Z' },
{ id: 'a-6', user: 'Fredrick Rajapakse', action: 'Custom report created', report: 'Customer Sales Analysis', dataSource: ERP, timestamp: '2026-09-08T06:58:00Z' },
{ id: 'a-7', user: 'Nayomika Silva', action: 'Report executed — 1,245 records in 1.8s', report: 'Open Invoices', dataSource: ERP, timestamp: '2026-09-07T16:22:00Z' },
{ id: 'a-8', user: 'Dilani Gunawardena', action: 'Report executed', report: 'Average Days to Pay', dataSource: ERP, timestamp: '2026-09-07T14:02:00Z' },
{ id: 'a-9', user: 'Fredrick Rajapakse', action: 'Customized template saved', report: 'Sales by Customer – Management View', dataSource: ERP, timestamp: '2026-09-07T10:48:00Z' },
{ id: 'a-10', user: 'Ruwan Jayasuriya', action: 'Role permissions updated', report: 'Report Designer', timestamp: '2026-09-06T15:30:00Z' },
{ id: 'a-11', user: 'Chamila Perera', action: 'Report scheduled (Weekly, PDF)', report: 'Sales by Rep Detail', dataSource: ERP, timestamp: '2026-09-06T09:12:00Z' },
{ id: 'a-12', user: 'Nayomika Silva', action: 'Report exported (PDF)', report: 'Sales by Rep Detail', dataSource: ERP, timestamp: '2026-09-05T17:40:00Z' }];


export const scheduledReports: ScheduledReport[] = [
{
  id: 's-1',
  reportName: 'Open Invoices',
  frequency: 'Daily',
  time: '07:00',
  recipients: ['finance@polydime.lk', 'ar@polydime.lk'],
  format: 'Excel',
  nextRun: 'Tomorrow, 07:00',
  status: 'Active'
},
{
  id: 's-2',
  reportName: 'Sales by Rep Detail',
  frequency: 'Weekly',
  time: '08:30',
  recipients: ['sales.managers@polydime.lk'],
  format: 'PDF',
  nextRun: 'Monday, 08:30',
  status: 'Active'
},
{
  id: 's-3',
  reportName: 'Average Days to Pay',
  frequency: 'Monthly',
  time: '06:00',
  recipients: ['cfo@polydime.lk', 'finance@polydime.lk'],
  format: 'PDF',
  nextRun: '01 Oct, 06:00',
  status: 'Active'
},
{
  id: 's-4',
  reportName: 'Customer Outstanding Report',
  frequency: 'Weekly',
  time: '17:00',
  recipients: ['collections@polydime.lk'],
  format: 'CSV',
  nextRun: 'Paused',
  status: 'Paused'
}];


export const dataSource = {
  name: 'ERP Production Database',
  type: 'Microsoft SQL Server 2019',
  server: 'erp-sql-prd-01.polydime.internal',
  database: 'POLYDIME_ERP',
  authentication: 'Service account via secure backend API',
  status: 'Connected' as const,
  lastSync: '2026-09-08T06:15:00Z',
  latencyMs: 42
};