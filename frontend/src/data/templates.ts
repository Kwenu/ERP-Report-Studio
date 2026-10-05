import type {
  Aggregation,
  ColumnFormat,
  DataType,
  ErpField,
  ReportColumn,
  ReportDefinition } from
'../types/erp';

export function defaultFormat(dataType: DataType): ColumnFormat {
  switch (dataType) {
    case 'currency':
      return 'currency';
    case 'decimal':
    case 'integer':
      return 'number';
    case 'date':
    case 'datetime':
      return 'date';
    case 'boolean':
      return 'boolean';
    default:
      return 'text';
  }
}

export function defaultAlign(dataType: DataType): ReportColumn['align'] {
  return dataType === 'currency' || dataType === 'decimal' || dataType === 'integer' ?
  'right' :
  'left';
}

interface ColumnOptions {
  width?: number;
  aggregation?: Aggregation;
  decimals?: number;
  align?: ReportColumn['align'];
  locked?: boolean;
  format?: ColumnFormat;
  pinned?: boolean;
}

export function makeColumn(
id: string,
key: string,
label: string,
dataType: DataType,
opts: ColumnOptions = {})
: ReportColumn {
  return {
    id,
    key,
    label,
    dataType,
    format: opts.format ?? defaultFormat(dataType),
    decimals:
    opts.decimals ?? (dataType === 'currency' ? 2 : dataType === 'decimal' ? 2 : 0),
    align: opts.align ?? defaultAlign(dataType),
    width: opts.width ?? 130,
    aggregation: opts.aggregation ?? 'none',
    visible: true,
    pinned: opts.pinned ?? false,
    locked: opts.locked ?? false
  };
}

export function columnFromField(field: ErpField): ReportColumn {
  return makeColumn(field.id, field.key ?? field.name, field.displayName, field.dataType, {
    aggregation:
    field.dataType === 'currency' || field.dataType === 'decimal' ? 'sum' : 'none',
    width: field.dataType === 'text' ? 170 : 120
  });
}

const baseDefinition = {
  owner: 'System',
  createdBy: 'System',
  filters: [],
  sort: [],
  showSubtotals: true,
  showGrandTotal: true,
  showRowCount: true,
  weightedAverage: false,
  headerStyle: 'bold' as const,
  fontSize: 'compact' as const,
  visibility: 'Shared with Company' as const,
  type: 'Fixed Template' as const,
  lastModified: '2026-09-02T10:12:00Z',
  lastRun: '2026-09-08T07:40:00Z'
};

export const salesByCustomerDetail: ReportDefinition = {
  ...baseDefinition,
  id: 'sales-by-customer-detail',
  name: 'Sales by Customer Detail',
  description:
  'Invoice line detail for the period, grouped by customer with quantity and amount subtotals.',
  category: 'Sales',
  dataset: 'salesLines',
  basis: 'Accrual',
  dateFrom: '2026-09-01',
  dateTo: '2026-09-30',
  groupBy: 'name',
  columns: [
  makeColumn('Invoices.InvoiceDate', 'date', 'Date', 'date', { width: 96, locked: true }),
  makeColumn('Invoices.InvoiceNumber', 'num', 'Num', 'text', { width: 100, locked: true }),
  makeColumn('Customers.CustomerName', 'name', 'Name', 'text', { width: 200, locked: true }),
  makeColumn('Invoices.Terms', 'terms', 'Terms', 'text', { width: 110, locked: true }),
  makeColumn('Invoices.DueDate', 'dueDate', 'Due Date', 'date', { width: 100, locked: true }),
  makeColumn('Items.ItemName', 'item', 'Item', 'text', { width: 210, locked: true }),
  makeColumn('Invoices.PaidStatus', 'paid', 'Paid', 'text', { width: 70, locked: true, align: 'center' }),
  makeColumn('InvoiceLines.Quantity', 'qty', 'Qty', 'decimal', {
    width: 90,
    aggregation: 'sum',
    decimals: 0,
    locked: true
  }),
  makeColumn('InvoiceLines.SalesPrice', 'salesPrice', 'Sales Price', 'currency', {
    width: 110,
    locked: true
  }),
  makeColumn('InvoiceLines.Amount', 'amount', 'Amount', 'currency', {
    width: 130,
    aggregation: 'sum',
    locked: true
  }),
  makeColumn('Invoices.PONumber', 'other2', 'Other 2', 'text', { width: 110, locked: true })]

};

export const averageDaysToPay: ReportDefinition = {
  ...baseDefinition,
  id: 'average-days-to-pay',
  name: 'Average Days to Pay',
  description:
  'Payment performance per customer measured as paid date less due date across all transactions.',
  category: 'Receivables',
  subtitle: 'All Transactions',
  dataset: 'paymentTxns',
  groupBy: 'name',
  weightedAverage: false,
  columns: [
  makeColumn('Invoices.InvoiceDate', 'date', 'Date', 'date', { width: 96, locked: true }),
  makeColumn('Invoices.InvoiceNumber', 'num', 'Num', 'text', { width: 100, locked: true }),
  makeColumn('Invoices.PaidStatus', 'paid', 'Paid', 'text', { width: 70, locked: true, align: 'center' }),
  makeColumn('Invoices.TotalAmount', 'amount', 'Amount', 'currency', {
    width: 130,
    aggregation: 'sum',
    locked: true
  }),
  makeColumn('Customers.CustomerName', 'name', 'Name', 'text', { width: 210, locked: true }),
  makeColumn('Invoices.Terms', 'terms', 'Terms', 'text', { width: 110, locked: true }),
  makeColumn('Invoices.DueDate', 'dueDate', 'Due Date', 'date', { width: 100, locked: true }),
  makeColumn('Payments.PaymentDate', 'paidDate', 'Paid Date', 'date', {
    width: 100,
    locked: true
  }),
  makeColumn('Payments.AvgDaysToPay', 'avgDaysToPay', 'Avg Days to Pay', 'decimal', {
    width: 130,
    aggregation: 'avg',
    decimals: 1,
    locked: true
  })]

};

export const salesByRepDetail: ReportDefinition = {
  ...baseDefinition,
  id: 'sales-by-rep-detail',
  name: 'Sales by Rep Detail',
  description:
  'Invoice line detail grouped by sales representative for the selected transaction date range.',
  category: 'Sales',
  dataset: 'salesLines',
  dateFrom: '2026-09-01',
  dateTo: '2026-09-30',
  groupBy: 'rep',
  columns: [
  makeColumn('Invoices.InvoiceDate', 'date', 'Date', 'date', { width: 96, locked: true }),
  makeColumn('Invoices.InvoiceNumber', 'num', 'Num', 'text', { width: 100, locked: true }),
  makeColumn('Customers.CustomerName', 'name', 'Name', 'text', { width: 200, locked: true }),
  makeColumn('Invoices.Terms', 'terms', 'Terms', 'text', { width: 110, locked: true }),
  makeColumn('Invoices.Memo', 'memo', 'Memo', 'text', { width: 190, locked: true }),
  makeColumn('Items.ItemName', 'item', 'Item', 'text', { width: 200, locked: true }),
  makeColumn('InvoiceLines.Quantity', 'qty', 'Qty', 'decimal', {
    width: 90,
    aggregation: 'sum',
    decimals: 0,
    locked: true
  }),
  makeColumn('InvoiceLines.SalesPrice', 'salesPrice', 'Sales Price', 'currency', {
    width: 110,
    locked: true
  }),
  makeColumn('InvoiceLines.Amount', 'amount', 'Amount', 'currency', {
    width: 130,
    aggregation: 'sum',
    locked: true
  }),
  makeColumn('SalesRepresentatives.RepCode', 'other1', 'Other 1', 'text', {
    width: 100,
    locked: true
  })]

};

export const openInvoicesReport: ReportDefinition = {
  ...baseDefinition,
  id: 'open-invoices',
  name: 'Open Invoices',
  description:
  'All unpaid customer documents as of today with aging days and open balance by customer.',
  category: 'Receivables',
  dataset: 'openInvoices',
  groupBy: 'name',
  columns: [
  makeColumn('Invoices.Type', 'type', 'Type', 'text', { width: 110, locked: true }),
  makeColumn('Invoices.InvoiceDate', 'date', 'Date', 'date', { width: 96, locked: true }),
  makeColumn('Invoices.InvoiceNumber', 'num', 'Num', 'text', { width: 100, locked: true }),
  makeColumn('Invoices.PONumber', 'po', 'P.O. #', 'text', { width: 110, locked: true }),
  makeColumn('Invoices.Terms', 'terms', 'Terms', 'text', { width: 120, locked: true }),
  makeColumn('Invoices.Aging', 'aging', 'Aging', 'integer', {
    width: 90,
    decimals: 0,
    locked: true
  }),
  makeColumn('Invoices.OpenBalance', 'openBalance', 'Open Balance', 'currency', {
    width: 140,
    aggregation: 'sum',
    locked: true
  }),
  makeColumn('Invoices.TotalAmount', 'amount', 'Amount', 'currency', {
    width: 140,
    aggregation: 'sum',
    locked: true
  })]

};

export const fixedTemplates: ReportDefinition[] = [
salesByCustomerDetail,
averageDaysToPay,
salesByRepDetail,
openInvoicesReport];


export function getTemplate(id: string): ReportDefinition | undefined {
  return fixedTemplates.find((t) => t.id === id);
}

export function cloneDefinition(def: ReportDefinition): ReportDefinition {
  return {
    ...def,
    columns: def.columns.map((c) => ({ ...c })),
    filters: def.filters.map((f) => ({ ...f })),
    sort: def.sort.map((s) => ({ ...s }))
  };
}

export function blankReport(): ReportDefinition {
  return {
    id: `draft-${Date.now()}`,
    name: 'Untitled Report',
    description: '',
    category: 'Sales',
    owner: 'Chamila Perera',
    createdBy: 'Chamila Perera',
    visibility: 'Private',
    type: 'Custom Report',
    dataset: 'salesLines',
    columns: [],
    groupBy: null,
    filters: [],
    sort: [],
    showSubtotals: true,
    showGrandTotal: true,
    showRowCount: true,
    weightedAverage: false,
    headerStyle: 'bold',
    fontSize: 'compact',
    lastModified: new Date().toISOString(),
    lastRun: new Date().toISOString()
  };
}

/** Groupable dimensions offered in the configuration panel. */
export const groupOptions = [
{ key: 'name', label: 'Customer' },
{ key: 'rep', label: 'Sales Representative' },
{ key: 'item', label: 'Item' },
{ key: 'date', label: 'Date' },
{ key: 'category', label: 'Category' },
{ key: 'terms', label: 'Terms' }];