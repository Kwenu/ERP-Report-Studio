/* Drop this in src/services/reportsApi.ts.
 * Optional next step: wire these into AppContext.tsx in place of the
 * in-memory `savedReports` state, so reports persist across sessions.
 * See the "Wiring real persistence into AppContext" section of the
 * backend README for a guided, incremental migration.
 */
import type { ReportDefinition } from '../types/erp';
import { http } from './http';

export async function listReports(opts?: { mine?: boolean; favoritesOnly?: boolean }) {
  const params = new URLSearchParams();
  if (opts?.mine) params.set('mine', 'true');
  if (opts?.favoritesOnly) params.set('favoritesOnly', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';
  return http<{ reports: (ReportDefinition & { isFavorite: boolean })[] }>(`/reports${qs}`);
}

export async function getReport(id: string) {
  return http<ReportDefinition>(`/reports/${id}`);
}

/** Creates a new report, or updates an existing one when `report.id` already exists. */
export async function saveReport(report: ReportDefinition) {
  return http<ReportDefinition>('/reports', { method: 'POST', body: JSON.stringify(report) });
}

export async function deleteReport(id: string) {
  return http<void>(`/reports/${id}`, { method: 'DELETE' });
}

export async function duplicateReport(id: string) {
  return http<ReportDefinition>(`/reports/${id}/duplicate`, { method: 'POST' });
}

export async function setFavorite(id: string, favorite: boolean) {
  return http<{ favorite: boolean }>(`/reports/${id}/favorite`, {
    method: 'POST',
    body: JSON.stringify({ favorite })
  });
}

export async function fetchAuditLog(limit = 200) {
  return http<{ audit: unknown[] }>(`/audit?limit=${limit}`);
}
