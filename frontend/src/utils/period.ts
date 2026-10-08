import { isoAddDays, pad, todayIso } from './format';

/** Month the financial year starts in (4 = April, so FY 2026 runs 1 Apr 2026 – 31 Mar 2027). Change here if needed. */
export const FISCAL_YEAR_START_MONTH = 4;

export type PeriodId =
'today' |
'thisMonth' |
'lastMonth' |
'thisQuarter' |
'thisFY' |
'lastFY' |
'last30' |
'last90' |
'all';

export const periodPresets: {id: PeriodId;label: string;}[] = [
{ id: 'thisFY', label: 'Financial year to date' },
{ id: 'thisMonth', label: 'This month' },
{ id: 'lastMonth', label: 'Last month' },
{ id: 'thisQuarter', label: 'This quarter' },
{ id: 'lastFY', label: 'Last financial year' },
{ id: 'last30', label: 'Last 30 days' },
{ id: 'last90', label: 'Last 90 days' },
{ id: 'today', label: 'Today' },
{ id: 'all', label: 'All dates' }];


export interface DateRange {
  from: string;
  to: string;
}

const toIso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
/** month is 1-based; day 0 = last day of the previous month, month 13 = January of next year. */
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

export function presetRange(id: PeriodId, today: string = todayIso()): DateRange {
  const [y, m] = today.split('-').map(Number);
  const fy = FISCAL_YEAR_START_MONTH;
  switch (id) {
    case 'today':
      return { from: today, to: today };
    case 'thisMonth':
      return { from: toIso(utc(y, m, 1)), to: toIso(utc(y, m + 1, 0)) };
    case 'lastMonth':
      return { from: toIso(utc(y, m - 1, 1)), to: toIso(utc(y, m, 0)) };
    case 'thisQuarter':{
        const qStart = Math.floor((m - 1) / 3) * 3 + 1;
        return { from: toIso(utc(y, qStart, 1)), to: toIso(utc(y, qStart + 3, 0)) };
      }
    case 'thisFY':{
        const startYear = m >= fy ? y : y - 1;
        return { from: toIso(utc(startYear, fy, 1)), to: today };
      }
    case 'lastFY':{
        const startYear = (m >= fy ? y : y - 1) - 1;
        return { from: toIso(utc(startYear, fy, 1)), to: toIso(utc(startYear + 1, fy, 0)) };
      }
    case 'last30':
      return { from: isoAddDays(today, -29), to: today };
    case 'last90':
      return { from: isoAddDays(today, -89), to: today };
    case 'all':
      return { from: '', to: '' };
  }
}

/** Which preset the current dates correspond to, or 'custom' when they were typed in by hand. */
export function matchPreset(from: string, to: string, today: string = todayIso()): PeriodId | 'custom' {
  if (!from && !to) return 'all';
  for (const p of periodPresets) {
    const r = presetRange(p.id, today);
    if (r.from === from && r.to === to) return p.id;
  }
  return 'custom';
}

/** Default period of the sales reports: from the start of the current financial year up to today. */
export function financialYearToDate(): DateRange {
  return presetRange('thisFY');
}
