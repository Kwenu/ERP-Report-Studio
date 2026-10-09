import type { ErpField, ErpTable, Relationship } from '../types/erp';

type FieldOpts = {
  nullable?: boolean;
  reportable?: boolean;
  isKey?: boolean;
  fk?: string;
};

type FieldSpec = [
  name: string,
  displayName: string,
  dataType: ErpField['dataType'],
  description: string,
  example: string,
  key?: string,
  opts?: FieldOpts];


function build(
table: string,
description: string,
records: number,
lastUpdated: string,
status: ErpTable['status'],
specs: FieldSpec[])
: ErpTable {
  return {
    name: table,
    description,
    records,
    lastUpdated,
    status,
    fields: specs.map(([name, displayName, dataType, desc, example, key, opts]) => ({
      id: `${table}.${name}`,
      table,
      name,
      displayName,
      dataType,
      description: desc,
      example,
      key,
      nullable: opts?.nullable ?? false,
      reportable: opts?.reportable ?? true,
      isKey: opts?.isKey ?? false,
      references: opts?.fk
    }))
  };
}

export const erpTables: ErpTable[] = [
build('Customers', 'Customer master records', 4250, '2026-09-09T06:15:00Z', 'Active', [
['CustomerID', 'Customer ID', 'integer', 'Primary key', '10428', 'customerId', { isKey: true }],
['CustomerName', 'Customer', 'text', 'Registered customer name', 'Biosmart LK (Pvt) Ltd', 'name'],
['Address', 'Address', 'text', 'Street address', '112 Galle Road', 'address', { nullable: true }],
['City', 'City', 'text', 'City / town', 'Colombo 03', 'city'],
['Phone', 'Phone', 'text', 'Primary contact number', '+94 11 234 5678', 'phone', { nullable: true }],
['Email', 'Email', 'text', 'Billing email', 'accounts@biosmart.lk', 'email', { nullable: true }],
['CreditLimit', 'Credit Limit', 'currency', 'Approved credit ceiling', '2,500,000.00', 'creditLimit']]
),
build('Invoices', 'Sales invoice headers', 128540, '2026-09-09T06:15:00Z', 'Active', [
['InvoiceID', 'Invoice ID', 'integer', 'Primary key', '88214', 'invoiceId', { isKey: true }],
['InvoiceNumber', 'Invoice Number', 'text', 'Document number', 'INV-24188', 'num'],
['ManualNumber', 'Manual No.', 'text', 'Manual reference typed in when the invoice was entered', '1042', 'manualNo', { nullable: true }],
['Currency', 'Currency', 'text', 'Invoice currency (LKR / USD)', 'LKR', 'currency', { nullable: true }],
['Company', 'Company', 'text', 'Company the invoice belongs to', 'Polydime', 'company', { nullable: true }],
['InvoiceDate', 'Date', 'date', 'Transaction date', '04/09/2023', 'date'],
['CustomerID', 'Customer ID', 'integer', 'FK to Customers', '10428', 'customerId', { fk: 'Customers.CustomerID' }],
['SalesRepID', 'Sales Rep ID', 'integer', 'FK to Employees', '7', 'repId', { fk: 'Employees.EmployeeID' }],
['Terms', 'Terms', 'text', 'Payment terms', 'Net 30', 'terms'],
['DueDate', 'Due Date', 'date', 'Payment due date', '05/09/2023', 'dueDate'],
['TotalAmount', 'Amount', 'currency', 'Invoice total', '186,400.00', 'amount'],
['OpenBalance', 'Open Balance', 'currency', 'Unpaid balance', '42,300.00', 'openBalance'],
['Status', 'Invoice Status', 'text', 'Open / Paid / Void', 'Open', 'status'],
['PONumber', 'P.O. #', 'text', 'Customer purchase order', 'PO-88231', 'po', { nullable: true }],
['Memo', 'Memo', 'text', 'Free-text memo', 'Bulk order — April', 'memo', { nullable: true }],
['Type', 'Type', 'text', 'Document type', 'Invoice', 'type'],
['PaidStatus', 'Paid', 'text', 'Paid flag (Yes / No)', 'Yes', 'paid'],
['Aging', 'Aging', 'integer', 'Days past due as of today', '46', 'aging']]
),
build('InvoiceLines', 'Sales invoice line items', 542100, '2026-09-09T06:15:00Z', 'Active', [
['InvoiceLineID', 'Line ID', 'integer', 'Primary key', '441280', 'lineId', { isKey: true }],
['InvoiceID', 'Invoice ID', 'integer', 'FK to Invoices', '88214', 'invoiceId', { fk: 'Invoices.InvoiceID' }],
['ItemID', 'Item ID', 'integer', 'FK to Items', '318', 'itemId', { fk: 'Items.ItemID' }],
['AccountID', 'GL Account ID', 'integer', 'FK to Accounts', '4000', undefined, { fk: 'Accounts.AccountID' }],
['Quantity', 'Qty', 'decimal', 'Units sold', '120', 'qty'],
['SalesPrice', 'Sales Price', 'currency', 'Unit price', '1,450.00', 'salesPrice'],
['Amount', 'Amount', 'currency', 'Extended line amount', '174,000.00', 'amount'],
['LineMemo', 'Line Memo', 'text', 'Line level note', 'Includes pallet charge', 'memo', { nullable: true }]]
),
build('Payments', 'Customer payment receipts', 86320, '2026-09-09T06:15:00Z', 'Active', [
['PaymentID', 'Payment ID', 'integer', 'Primary key', '55912', 'paymentId', { isKey: true }],
['InvoiceID', 'Invoice ID', 'integer', 'FK to Invoices', '88214', 'invoiceId', { fk: 'Invoices.InvoiceID' }],
['CustomerID', 'Customer ID', 'integer', 'FK to Customers', '10428', 'customerId', { fk: 'Customers.CustomerID' }],
['PaymentDate', 'Paid Date', 'date', 'Date payment cleared', '05/22/2023', 'paidDate', { nullable: true }],
['PaymentAmount', 'Payment Amount', 'currency', 'Amount received', '186,400.00', 'paidAmount'],
['PaymentMethod', 'Payment Method', 'text', 'Cheque / Transfer / Cash', 'Bank Transfer', 'paymentMethod'],
['Reference', 'Payment Reference', 'text', 'Bank or cheque reference', 'CHQ-441280', undefined, { nullable: true }],
['AvgDaysToPay', 'Avg Days to Pay', 'decimal', 'Paid date less due date', '12.5', 'avgDaysToPay', { nullable: true }]]
),
build('SalesOrders', 'Sales order headers', 96420, '2026-09-09T05:10:00Z', 'Active', [
['SalesOrderID', 'Order ID', 'integer', 'Primary key', '30188', undefined, { isKey: true }],
['OrderNumber', 'Order Number', 'text', 'Document number', 'SO-30188', undefined],
['OrderDate', 'Order Date', 'date', 'Order placed on', '04/02/2023', undefined],
['CustomerID', 'Customer ID', 'integer', 'FK to Customers', '10428', 'customerId', { fk: 'Customers.CustomerID' }],
['SalesRepID', 'Sales Rep ID', 'integer', 'FK to Employees', '7', 'repId', { fk: 'Employees.EmployeeID' }],
['WarehouseID', 'Warehouse ID', 'integer', 'FK to Warehouses', '3', undefined, { fk: 'Warehouses.WarehouseID' }],
['Status', 'Order Status', 'text', 'Open / Shipped / Closed', 'Shipped', undefined]]
),
build('SalesOrderLines', 'Sales order line items', 428150, '2026-09-09T05:10:00Z', 'Active', [
['SalesOrderLineID', 'Order Line ID', 'integer', 'Primary key', '188422', undefined, { isKey: true }],
['SalesOrderID', 'Order ID', 'integer', 'FK to SalesOrders', '30188', undefined, { fk: 'SalesOrders.SalesOrderID' }],
['ItemID', 'Item ID', 'integer', 'FK to Items', '318', 'itemId', { fk: 'Items.ItemID' }],
['OrderedQty', 'Ordered Qty', 'decimal', 'Quantity ordered', '150', undefined],
['SalesPrice', 'Order Price', 'currency', 'Agreed unit price', '1,450.00', undefined],
['Amount', 'Order Amount', 'currency', 'Extended order line value', '217,500.00', undefined]]
),
build('Items', 'Item / product catalogue', 1284, '2026-09-08T18:20:00Z', 'Active', [
['ItemID', 'Item ID', 'integer', 'Primary key', '318', 'itemId', { isKey: true }],
['ItemName', 'Item', 'text', 'Item description', 'Riococo Grow Slab 100x20', 'item'],
['Category', 'Category', 'text', 'Product category', 'Substrates', 'category'],
['UnitPrice', 'Unit Price', 'currency', 'List price', '1,450.00', 'salesPrice'],
['UOM', 'Unit of Measure', 'text', 'Selling unit', 'EA', 'uom'],
['ProductID', 'Product ID', 'integer', 'FK to Products', '212', undefined, { fk: 'Products.ProductID' }],
['SupplierID', 'Supplier ID', 'integer', 'FK to Suppliers', '2201', undefined, { fk: 'Suppliers.SupplierID' }]]
),
build('Products', 'Manufactured product master', 640, '2026-09-08T18:20:00Z', 'Active', [
['ProductID', 'Product ID', 'integer', 'Primary key', '212', undefined, { isKey: true }],
['ProductName', 'Product Name', 'text', 'Product description', 'Coco Peat Block 5kg', undefined],
['ProductLine', 'Product Line', 'text', 'Line grouping', 'Horticulture', undefined],
['StandardCost', 'Standard Cost', 'currency', 'Costing rate', '640.00', undefined]]
),
build('Employees', 'Employee master', 312, '2026-09-08T09:10:00Z', 'Active', [
['EmployeeID', 'Employee ID', 'integer', 'Primary key', '7', 'repId', { isKey: true }],
['EmployeeName', 'Employee Name', 'text', 'Full name', 'Nishan Perera', 'repName'],
['Department', 'Department', 'text', 'Assigned department', 'Sales', 'department'],
['DepartmentID', 'Department ID', 'integer', 'FK to Departments', '4', undefined, { fk: 'Departments.DepartmentID' }]]
),
build('SalesRepresentatives', 'Sales rep codes', 24, '2026-09-08T09:10:00Z', 'Active', [
['SalesRepID', 'Sales Rep ID', 'integer', 'Primary key', '7', 'repId', { isKey: true }],
['RepCode', 'Sales Representative', 'text', 'Short rep code', 'DIS', 'rep'],
['RepName', 'Rep Full Name', 'text', 'Representative name', 'Dissanayake B.', 'repName'],
['Territory', 'Territory', 'text', 'Assigned territory', 'Western', 'territory'],
['DepartmentID', 'Department ID', 'integer', 'FK to Departments', '4', undefined, { fk: 'Departments.DepartmentID' }]]
),
build('Accounts', 'General ledger accounts', 486, '2026-09-07T14:00:00Z', 'Active', [
['AccountID', 'Account ID', 'integer', 'Primary key', '4000', undefined, { isKey: true }],
['AccountName', 'Account Name', 'text', 'GL account description', 'Sales — Horticulture', undefined],
['AccountType', 'Account Type', 'text', 'Income / Expense / Asset', 'Income', undefined]]
),
build('Suppliers', 'Supplier master', 1428, '2026-09-07T14:00:00Z', 'Active', [
['SupplierID', 'Supplier ID', 'integer', 'Primary key', '2201', undefined, { isKey: true }],
['SupplierName', 'Supplier Name', 'text', 'Registered supplier', 'Lanka Coir Mills', undefined],
['Country', 'Country', 'text', 'Supplier country', 'Sri Lanka', undefined]]
),
build('PurchaseOrders', 'Purchase order headers', 64120, '2026-09-06T11:30:00Z', 'Stale', [
['PurchaseOrderID', 'PO ID', 'integer', 'Primary key', '77120', undefined, { isKey: true }],
['PONumber', 'PO Number', 'text', 'Document number', 'PUR-77120', undefined],
['OrderDate', 'PO Date', 'date', 'Ordered on', '03/28/2023', undefined],
['SupplierID', 'Supplier ID', 'integer', 'FK to Suppliers', '2201', undefined, { fk: 'Suppliers.SupplierID' }],
['Status', 'PO Status', 'text', 'Open / Received / Closed', 'Received', undefined]]
),
build('PurchaseOrderLines', 'Purchase order line items', 262400, '2026-09-06T11:30:00Z', 'Stale', [
['POLineID', 'PO Line ID', 'integer', 'Primary key', '331200', undefined, { isKey: true }],
['PurchaseOrderID', 'PO ID', 'integer', 'FK to PurchaseOrders', '77120', undefined, { fk: 'PurchaseOrders.PurchaseOrderID' }],
['ItemID', 'Item ID', 'integer', 'FK to Items', '318', 'itemId', { fk: 'Items.ItemID' }],
['ReceivedQty', 'Received Qty', 'decimal', 'Quantity received', '500', undefined],
['UnitCost', 'Unit Cost', 'currency', 'Purchase cost per unit', '780.00', undefined]]
),
build('Inventory', 'Daily stock position by item and warehouse', 1229417, '2026-09-09T04:00:00Z', 'Syncing', [
['InventoryID', 'Inventory ID', 'integer', 'Primary key', '90211', undefined, { isKey: true }],
['ItemID', 'Item ID', 'integer', 'FK to Items', '318', 'itemId', { fk: 'Items.ItemID' }],
['QtyOnHand', 'Qty On Hand', 'decimal', 'Available stock', '2,410', undefined],
['WarehouseID', 'Warehouse ID', 'integer', 'FK to Warehouses', '3', undefined, { fk: 'Warehouses.WarehouseID' }]]
),
build('Warehouses', 'Warehouse locations', 12, '2026-09-05T08:00:00Z', 'Active', [
['WarehouseID', 'Warehouse ID', 'integer', 'Primary key', '3', undefined, { isKey: true }],
['WarehouseName', 'Warehouse', 'text', 'Location name', 'Katunayake DC', undefined],
['Location', 'Warehouse Location', 'text', 'City / zone', 'Katunayake', undefined]]
),
build('Departments', 'Company departments', 18, '2026-09-05T08:00:00Z', 'Active', [
['DepartmentID', 'Department ID', 'integer', 'Primary key', '4', undefined, { isKey: true }],
['DepartmentName', 'Department', 'text', 'Department name', 'Finance', 'department']]
)];


/** Discovered by the schema/metadata service — parent (PK) → child (FK). */
export const relationships: Relationship[] = [
{ fromTable: 'Customers', fromField: 'CustomerID', toTable: 'Invoices', toField: 'CustomerID' },
{ fromTable: 'Customers', fromField: 'CustomerID', toTable: 'SalesOrders', toField: 'CustomerID' },
{ fromTable: 'Customers', fromField: 'CustomerID', toTable: 'Payments', toField: 'CustomerID' },
{ fromTable: 'Invoices', fromField: 'InvoiceID', toTable: 'InvoiceLines', toField: 'InvoiceID' },
{ fromTable: 'Invoices', fromField: 'InvoiceID', toTable: 'Payments', toField: 'InvoiceID' },
{ fromTable: 'Employees', fromField: 'EmployeeID', toTable: 'Invoices', toField: 'SalesRepID' },
{ fromTable: 'Employees', fromField: 'EmployeeID', toTable: 'SalesOrders', toField: 'SalesRepID' },
{ fromTable: 'Employees', fromField: 'EmployeeID', toTable: 'SalesRepresentatives', toField: 'SalesRepID' },
{ fromTable: 'Departments', fromField: 'DepartmentID', toTable: 'Employees', toField: 'DepartmentID' },
{ fromTable: 'Departments', fromField: 'DepartmentID', toTable: 'SalesRepresentatives', toField: 'DepartmentID' },
{ fromTable: 'Items', fromField: 'ItemID', toTable: 'InvoiceLines', toField: 'ItemID' },
{ fromTable: 'Items', fromField: 'ItemID', toTable: 'SalesOrderLines', toField: 'ItemID' },
{ fromTable: 'Items', fromField: 'ItemID', toTable: 'PurchaseOrderLines', toField: 'ItemID' },
{ fromTable: 'Items', fromField: 'ItemID', toTable: 'Inventory', toField: 'ItemID' },
{ fromTable: 'Products', fromField: 'ProductID', toTable: 'Items', toField: 'ProductID' },
{ fromTable: 'Suppliers', fromField: 'SupplierID', toTable: 'Items', toField: 'SupplierID' },
{ fromTable: 'Suppliers', fromField: 'SupplierID', toTable: 'PurchaseOrders', toField: 'SupplierID' },
{ fromTable: 'PurchaseOrders', fromField: 'PurchaseOrderID', toTable: 'PurchaseOrderLines', toField: 'PurchaseOrderID' },
{ fromTable: 'SalesOrders', fromField: 'SalesOrderID', toTable: 'SalesOrderLines', toField: 'SalesOrderID' },
{ fromTable: 'Warehouses', fromField: 'WarehouseID', toTable: 'Inventory', toField: 'WarehouseID' },
{ fromTable: 'Warehouses', fromField: 'WarehouseID', toTable: 'SalesOrders', toField: 'WarehouseID' },
{ fromTable: 'Accounts', fromField: 'AccountID', toTable: 'InvoiceLines', toField: 'AccountID' },
{ fromTable: 'SalesRepresentatives', fromField: 'SalesRepID', toTable: 'Invoices', toField: 'SalesRepID' }];


export const allFields: ErpField[] = erpTables.flatMap((t) => t.fields);

export function findField(id: string): ErpField | undefined {
  return allFields.find((f) => f.id === id);
}

export function relationshipsFor(table: string): Relationship[] {
  return relationships.filter((r) => r.fromTable === table || r.toTable === table);
}

export function primaryKeyOf(table: string): string | undefined {
  return erpTables.find((t) => t.name === table)?.fields.find((f) => f.isKey)?.name;
}

export function foreignKeysOf(table: string): ErpField[] {
  return erpTables.find((t) => t.name === table)?.fields.filter((f) => f.references) ?? [];
}

export const totalFieldCount = allFields.length;
export const totalTableCount = erpTables.length;
export const totalRelationshipCount = relationships.length;
export const totalRecordCount = erpTables.reduce((sum, t) => sum + t.records, 0);