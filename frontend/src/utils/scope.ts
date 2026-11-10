import type { DatasetId } from '../types/erp';

/**
 * Customer / Company "scope" of a report: two drop-downs in the controls bar that narrow the report to ONE customer
 * and / or ONE company. They are applied by the database (like the Type drop-down), so the result is complete even
 * when the period holds more than the 20,000 rows the screen loads at once.
 */
export interface ReportScope {
  customer: string;
  company: string;
}

export const emptyScope: ReportScope = { customer: '', company: '' };

/** Separator of the values inside an "is one of" filter's single `value` string. */
export const IN_SEPARATOR = '\u0001';

/** The customer codes of an AR details "is one of" filter (or a single "equals" filter) as a list. */
export function customerCodesOf(filters: Array<{ key: string; operator: string; value: string }>): string[] {
  const out: string[] = [];
  filters.forEach((f) => {
    if (f.key !== 'customerId' || !f.value) return;
    if (f.operator === 'equals') out.push(f.value);
    else if (f.operator === 'is one of') out.push(...f.value.split(IN_SEPARATOR).filter(Boolean));
  });
  return out;
}

/** The dataset column that holds the customer's name (null = the report has no customer to filter by). */
export function customerKeyFor(dataset: DatasetId): string | null {
  switch (dataset) {
    case 'salesLines':
    case 'paymentTxns':
    case 'openInvoices':
    case 'arSummary':
      return 'name';
    case 'mfgQuick':
    case 'inventoryQuick':
      return 'customer';
    default:
      // arTransactions: the customer is chosen at the top of the customer-details page (by customer code).
      // erpTable: Report Builder reports on a raw ERP table use the Filters panel instead.
      return null;
  }
}

/**
 * The dataset column(s) that hold the company. Only the reports that offer a Company filter are listed:
 * Sales by Customer / Rep Detail (salesLines), Manufacturing Quick and Inventory Quick.
 * The Inventory Quick Report has a From and a To company: a document matches when EITHER side is the chosen company.
 */
export function companyKeysFor(dataset: DatasetId): string[] {
  switch (dataset) {
    case 'salesLines':
    case 'mfgQuick':
      return ['company'];
    case 'inventoryQuick':
      return ['fromCompany', 'toCompany'];
    default:
      return [];
  }
}

export function hasCustomerFilter(dataset: DatasetId): boolean {
  return customerKeyFor(dataset) !== null;
}

export function hasCompanyFilter(dataset: DatasetId): boolean {
  return companyKeysFor(dataset).length > 0;
}
