import type { ColumnFormat, Row, ReportColumn } from '../types/erp';

const MONTHS = [
'Jan',
'Feb',
'Mar',
'Apr',
'May',
'Jun',
'Jul',
'Aug',
'Sep',
'Oct',
'Nov',
'Dec'];


export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** ISO (yyyy-mm-dd) -> MM/DD/YYYY */
export function formatDate(iso: string, style: 'us' | 'long' | 'iso' = 'us'): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number); // also accepts SQL datetimes (2026-09-01T00:00:00.000Z)
  if (!y || !m || !d) return iso;
  if (style === 'iso') return iso;
  if (style === 'long') return `${MONTHS[m - 1]} ${d}, ${y}`;
  return `${pad(m)}/${pad(d)}/${y}`;
}

export function monthLabel(iso: string): string {
  if (!iso) return '';
  const [y, m] = iso.split('-').map(Number);
  return `${
  [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'][
  m - 1]} ${
  y}`;
}

export function formatNumber(value: number, decimals = 2): string {
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return value < 0 ? `(${abs})` : abs;
}

export function formatValue(
value: Row[string] | undefined,
format: ColumnFormat,
decimals = 2)
: string {
  if (value === null || value === undefined || value === '') return '';
  switch (format) {
    case 'currency':
      return formatNumber(Number(value), decimals);
    case 'number':
      return formatNumber(Number(value), decimals);
    case 'percent':
      return `${formatNumber(Number(value) * 100, decimals)}%`;
    case 'date':
      return formatDate(String(value));
    case 'boolean':
      return value === true || value === 'Yes' ? 'Yes' : 'No';
    default:
      return String(value);
  }
}

export function formatCell(row: Row, col: ReportColumn): string {
  return formatValue(row[col.key], col.format, col.decimals);
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t1 - t2) / 86400000);
}

/** ISO timestamp -> "09 Sep 2026, 06:15 AM" */
export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hours = d.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(
    hour12
  )}:${pad(d.getMinutes())} ${suffix}`;
}

/** ISO timestamp -> "12:31 PM" */
export function formatClock(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const hours = d.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${pad(hour12)}:${pad(d.getMinutes())} ${suffix}`;
}

/** 134 -> "2m 14s" */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${mins}m` : `${mins}m ${rest}s`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso.slice(0, 10));
}