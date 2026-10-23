import type { ReportDefinition } from '../types/erp';
import { arTemplates, fixedTemplates, invTemplates, mfgTemplates } from './templates';

/** Every built-in (protected) report: Sales, AR, Manufacturing Quick and Inventory Quick. */
export const standardTemplates: ReportDefinition[] = [
  ...fixedTemplates,
  ...arTemplates,
  ...mfgTemplates,
  ...invTemplates
];

export type ReportSection = 'Sales' | 'AR' | 'Manufacturing' | 'Inventory' | 'Custom';

/** Which menu entry a report belongs to (used for the colour-coded section badges). */
export function reportSection(report: ReportDefinition): ReportSection {
  if (mfgTemplates.some((t) => t.id === report.id)) return 'Manufacturing';
  if (invTemplates.some((t) => t.id === report.id)) return 'Inventory';
  if (arTemplates.some((t) => t.id === report.id)) return 'AR';
  if (fixedTemplates.some((t) => t.id === report.id)) return 'Sales';
  return 'Custom';
}

/** The page that opens a report - each built-in report lives under its own menu entry. */
export function reportPath(report: ReportDefinition): string {
  switch (reportSection(report)) {
    case 'Manufacturing':
      return '/reports/manufacturing';
    case 'Inventory':
      return '/reports/inventory';
    case 'AR':
      return `/reports/ar/${report.id}`;
    case 'Sales':
      return `/reports/fixed/${report.id}`;
    default:
      return `/reports/view/${report.id}`;
  }
}
