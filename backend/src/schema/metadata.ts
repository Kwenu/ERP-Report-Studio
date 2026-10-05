import 'dotenv/config';
/* ------------------------------------------------------------------ *
 * Canonical ERP schema + dataset metadata.
 *
 * Two jobs:
 *   1. Answers GET /api/v1/schema/* so the frontend's Data Model /
 *      Tables & Fields pages have something real to show.
 *   2. Acts as an allow-list for the query engine: a report's `dataset`
 *      must be one of DATASETS below, and every column/filter/sort/
 *      group-by key it references must be one of that dataset's
 *      `columns`. Nothing outside this list is ever interpolated into
 *      SQL, so a report definition can never reach an arbitrary table
 *      or column.
 * ------------------------------------------------------------------ */

export type DataType = 'text' | 'integer' | 'decimal' | 'currency' | 'date' | 'datetime' | 'boolean';
export type UserRole = 'Administrator' | 'Report Designer' | 'Report Viewer';

export interface ErpField {
  id: string; // "Table.Field"
  table: string;
  name: string;
  displayName: string;
  dataType: DataType;
  description: string;
  nullable: boolean;
  reportable: boolean;
  isKey?: boolean;
  references?: string;
}

export interface ErpTable {
  name: string;
  description: string;
  fields: ErpField[];
}

export interface Relationship {
  fromTable: string;
  fromField: string;
  toTable: string;
  toField: string;
}

function field(
  table: string,
  name: string,
  displayName: string,
  dataType: DataType,
  description: string,
  opts: Partial<Pick<ErpField, 'nullable' | 'isKey' | 'references' | 'reportable'>> = {}
): ErpField {
  return {
    id: `${table}.${name}`,
    table,
    name,
    displayName,
    dataType,
    description,
    nullable: opts.nullable ?? false,
    reportable: opts.reportable ?? true,
    isKey: opts.isKey ?? false,
    references: opts.references
  };
}

export const erpTables: ErpTable[] = [
  {
    name: 'Customers',
    description: 'Customer master records',
    fields: [
      field('Customers', 'CustomerID', 'Customer ID', 'integer', 'Primary key', { isKey: true }),
      field('Customers', 'CustomerName', 'Customer', 'text', 'Registered customer name'),
      field('Customers', 'Address', 'Address', 'text', 'Street address', { nullable: true }),
      field('Customers', 'City', 'City', 'text', 'City / town'),
      field('Customers', 'Phone', 'Phone', 'text', 'Primary contact number', { nullable: true }),
      field('Customers', 'Email', 'Email', 'text', 'Billing email', { nullable: true }),
      field('Customers', 'CreditLimit', 'Credit Limit', 'currency', 'Approved credit ceiling')
    ]
  },
  {
    name: 'Invoices',
    description: 'Sales invoice headers',
    fields: [
      field('Invoices', 'InvoiceID', 'Invoice ID', 'integer', 'Primary key', { isKey: true }),
      field('Invoices', 'InvoiceNumber', 'Num', 'text', 'Document number'),
      field('Invoices', 'InvoiceDate', 'Date', 'date', 'Transaction date'),
      field('Invoices', 'CustomerID', 'Customer ID', 'integer', 'FK to Customers', {
        references: 'Customers.CustomerID'
      }),
      field('Invoices', 'SalesRepID', 'Sales Rep ID', 'integer', 'FK to Employees', {
        references: 'Employees.EmployeeID'
      }),
      field('Invoices', 'Terms', 'Terms', 'text', 'Payment terms'),
      field('Invoices', 'DueDate', 'Due Date', 'date', 'Payment due date'),
      field('Invoices', 'TotalAmount', 'Amount', 'currency', 'Invoice total'),
      field('Invoices', 'OpenBalance', 'Open Balance', 'currency', 'Unpaid balance'),
      field('Invoices', 'Status', 'Invoice Status', 'text', 'Open / Paid / Void'),
      field('Invoices', 'PONumber', 'P.O. #', 'text', 'Customer purchase order', { nullable: true }),
      field('Invoices', 'Memo', 'Memo', 'text', 'Free-text memo', { nullable: true }),
      field('Invoices', 'Type', 'Type', 'text', 'Document type'),
      field('Invoices', 'PaidStatus', 'Paid', 'text', 'Paid flag (Yes / No)')
    ]
  },
  {
    name: 'InvoiceLines',
    description: 'Sales invoice line items',
    fields: [
      field('InvoiceLines', 'InvoiceLineID', 'Line ID', 'integer', 'Primary key', { isKey: true }),
      field('InvoiceLines', 'InvoiceID', 'Invoice ID', 'integer', 'FK to Invoices', {
        references: 'Invoices.InvoiceID'
      }),
      field('InvoiceLines', 'ItemID', 'Item ID', 'integer', 'FK to Items', { references: 'Items.ItemID' }),
      field('InvoiceLines', 'Quantity', 'Qty', 'decimal', 'Units sold'),
      field('InvoiceLines', 'SalesPrice', 'Sales Price', 'currency', 'Unit price'),
      field('InvoiceLines', 'Amount', 'Amount', 'currency', 'Extended line amount'),
      field('InvoiceLines', 'LineMemo', 'Line Memo', 'text', 'Line level note', { nullable: true })
    ]
  },
  {
    name: 'Payments',
    description: 'Customer payment receipts',
    fields: [
      field('Payments', 'PaymentID', 'Payment ID', 'integer', 'Primary key', { isKey: true }),
      field('Payments', 'InvoiceID', 'Invoice ID', 'integer', 'FK to Invoices', {
        references: 'Invoices.InvoiceID'
      }),
      field('Payments', 'CustomerID', 'Customer ID', 'integer', 'FK to Customers', {
        references: 'Customers.CustomerID'
      }),
      field('Payments', 'PaymentDate', 'Paid Date', 'date', 'Date payment cleared', { nullable: true }),
      field('Payments', 'PaymentAmount', 'Payment Amount', 'currency', 'Amount received'),
      field('Payments', 'PaymentMethod', 'Payment Method', 'text', 'Cheque / Transfer / Cash'),
      field('Payments', 'AvgDaysToPay', 'Avg Days to Pay', 'decimal', 'Paid date less due date', {
        nullable: true
      })
    ]
  },
  {
    name: 'Items',
    description: 'Item / product catalogue',
    fields: [
      field('Items', 'ItemID', 'Item ID', 'integer', 'Primary key', { isKey: true }),
      field('Items', 'ItemName', 'Item', 'text', 'Item description'),
      field('Items', 'Category', 'Category', 'text', 'Product category'),
      field('Items', 'UnitPrice', 'Unit Price', 'currency', 'List price'),
      field('Items', 'UOM', 'Unit of Measure', 'text', 'Selling unit')
    ]
  },
  {
    name: 'Employees',
    description: 'Employee / sales representative master',
    fields: [
      field('Employees', 'EmployeeID', 'Employee ID', 'integer', 'Primary key', { isKey: true }),
      field('Employees', 'EmployeeName', 'Employee Name', 'text', 'Full name'),
      field('Employees', 'RepCode', 'Sales Representative', 'text', 'Short rep code'),
      field('Employees', 'Territory', 'Territory', 'text', 'Assigned territory'),
      field('Employees', 'DepartmentID', 'Department ID', 'integer', 'FK to Departments', {
        references: 'Departments.DepartmentID'
      })
    ]
  },
  {
    name: 'Departments',
    description: 'Company departments',
    fields: [
      field('Departments', 'DepartmentID', 'Department ID', 'integer', 'Primary key', { isKey: true }),
      field('Departments', 'DepartmentName', 'Department', 'text', 'Department name')
    ]
  }
];

export const relationships: Relationship[] = [
  { fromTable: 'Customers', fromField: 'CustomerID', toTable: 'Invoices', toField: 'CustomerID' },
  { fromTable: 'Customers', fromField: 'CustomerID', toTable: 'Payments', toField: 'CustomerID' },
  { fromTable: 'Invoices', fromField: 'InvoiceID', toTable: 'InvoiceLines', toField: 'InvoiceID' },
  { fromTable: 'Invoices', fromField: 'InvoiceID', toTable: 'Payments', toField: 'InvoiceID' },
  { fromTable: 'Employees', fromField: 'EmployeeID', toTable: 'Invoices', toField: 'SalesRepID' },
  { fromTable: 'Departments', fromField: 'DepartmentID', toTable: 'Employees', toField: 'DepartmentID' },
  { fromTable: 'Items', fromField: 'ItemID', toTable: 'InvoiceLines', toField: 'ItemID' }
];

export const allFields: ErpField[] = erpTables.flatMap((t) => t.fields);

/* ------------------------------------------------------------------ *
 * Dataset whitelist — what the report query engine is allowed to run.
 * Each dataset maps 1:1 to a SQL VIEW created in db/schema.sql. Every
 * key here is a column alias exposed by that view; the query builder
 * refuses to reference any column not listed.
 * ------------------------------------------------------------------ */

export type DatasetId = 'salesLines' | 'paymentTxns' | 'openInvoices';

export interface DatasetColumn {
  dataType: DataType;
  label: string;
}

export interface DatasetDefinition {
  id: DatasetId;
  view: string; // the underlying SQL view/table name, double-quoted when interpolated
  columns: Record<string, DatasetColumn>;
}

export const DATASETS: Record<DatasetId, DatasetDefinition> = {
  salesLines: {
    id: 'salesLines',
    view: 'v_sales_lines',
    columns: {
      lineId: { dataType: 'integer', label: 'Line ID' },
      invoiceId: { dataType: 'integer', label: 'Invoice ID' },
      customerId: { dataType: 'text', label: 'Customer ID' },
      date: { dataType: 'date', label: 'Date' },
      num: { dataType: 'text', label: 'Num' },
      name: { dataType: 'text', label: 'Name' },
      terms: { dataType: 'text', label: 'Terms' },
      dueDate: { dataType: 'date', label: 'Due Date' },
      item: { dataType: 'text', label: 'Item' },
      category: { dataType: 'text', label: 'Category' },
      paid: { dataType: 'text', label: 'Paid' },
      qty: { dataType: 'decimal', label: 'Qty' },
      salesPrice: { dataType: 'currency', label: 'Sales Price' },
      amount: { dataType: 'currency', label: 'Amount' },
      rep: { dataType: 'text', label: 'Sales Rep' },
      repName: { dataType: 'text', label: 'Rep Name' },
      department: { dataType: 'text', label: 'Department' },
      status: { dataType: 'text', label: 'Status' },
      city: { dataType: 'text', label: 'City' },
      po: { dataType: 'text', label: 'P.O. #' },
      uom: { dataType: 'text', label: 'UOM' },
      itemId: { dataType: 'text', label: 'Item ID' },
      repId: { dataType: 'text', label: 'Rep ID' },
      email: { dataType: 'text', label: 'Email' },
      creditLimit: { dataType: 'currency', label: 'Credit Limit' },
      memo: { dataType: 'text', label: 'Memo' },
      other1: { dataType: 'text', label: 'Other 1' },
      other2: { dataType: 'text', label: 'Other 2' },
      address: { dataType: 'text', label: 'Address' },
      phone: { dataType: 'text', label: 'Phone' },
      territory: { dataType: 'text', label: 'Territory' }
    }
  },
  paymentTxns: {
    id: 'paymentTxns',
    view: 'v_payment_txns',
    columns: {
      paymentId: { dataType: 'integer', label: 'Payment ID' },
      invoiceId: { dataType: 'integer', label: 'Invoice ID' },
      date: { dataType: 'date', label: 'Date' },
      num: { dataType: 'text', label: 'Num' },
      paid: { dataType: 'text', label: 'Paid' },
      amount: { dataType: 'currency', label: 'Amount' },
      name: { dataType: 'text', label: 'Name' },
      terms: { dataType: 'text', label: 'Terms' },
      dueDate: { dataType: 'date', label: 'Due Date' },
      paidDate: { dataType: 'date', label: 'Paid Date' },
      avgDaysToPay: { dataType: 'decimal', label: 'Avg Days to Pay' },
      paidAmount: { dataType: 'currency', label: 'Paid Amount' },
      paymentMethod: { dataType: 'text', label: 'Payment Method' },
      rep: { dataType: 'text', label: 'Sales Rep' },
      repName: { dataType: 'text', label: 'Rep Name' },
      status: { dataType: 'text', label: 'Status' },
      customerId: { dataType: 'text', label: 'Customer ID' }
    }
  },
  openInvoices: {
    id: 'openInvoices',
    view: 'v_open_invoices',
    columns: {
      type: { dataType: 'text', label: 'Type' },
      date: { dataType: 'date', label: 'Date' },
      num: { dataType: 'text', label: 'Num' },
      po: { dataType: 'text', label: 'P.O. #' },
      terms: { dataType: 'text', label: 'Terms' },
      aging: { dataType: 'integer', label: 'Aging' },
      openBalance: { dataType: 'currency', label: 'Open Balance' },
      amount: { dataType: 'currency', label: 'Amount' },
      name: { dataType: 'text', label: 'Name' },
      dueDate: { dataType: 'date', label: 'Due Date' },
      rep: { dataType: 'text', label: 'Sales Rep' },
      repName: { dataType: 'text', label: 'Rep Name' },
      status: { dataType: 'text', label: 'Status' },
      customerId: { dataType: 'text', label: 'Customer ID' },
      invoiceId: { dataType: 'integer', label: 'Invoice ID' },
      city: { dataType: 'text', label: 'City' }
    }
  }
};

// Let each deployment point a dataset at its own view without editing code:
//   DATASET_VIEW_SALESLINES=dbo.v_sales_lines  DATASET_VIEW_PAYMENTTXNS=...  DATASET_VIEW_OPENINVOICES=...
for (const d of Object.values(DATASETS)) {
  const override = process.env[`DATASET_VIEW_${d.id.toUpperCase()}`];
  if (override) d.view = override;
}

export const totalTableCount = erpTables.length;
export const totalFieldCount = allFields.length;
export const totalRelationshipCount = relationships.length;
