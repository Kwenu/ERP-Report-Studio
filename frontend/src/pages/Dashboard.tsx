import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarClockIcon,
  DatabaseIcon,
  FilePlus2Icon,
  FileTextIcon,
  LayersIcon,
  PenLineIcon,
  RefreshCwIcon,
  StarIcon,
  WrenchIcon } from
'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { ConnectionStatusDialog } from '../components/data/ConnectionStatusDialog';
import { useApp } from '../contexts/AppContext';
import { useErpConnection } from '../contexts/ErpConnectionContext';
import { reportPath, reportSection, standardTemplates, type ReportSection } from '../data/reportCatalog';
import { formatDateTime } from '../utils/format';
import { cx } from '../utils/ui';

/** One colour per report section - used by the library bars and the badges, so the same report type always looks the same. */
const SECTIONS: {
  key: ReportSection;
  label: string;
  to: string;
  bar: string;
  tone: 'navy' | 'amber' | 'teal' | 'violet' | 'blue';
}[] = [
{ key: 'Sales', label: 'Sales Report - Mr. Johann', to: '/reports/fixed', bar: 'bg-accent-500', tone: 'navy' },
{ key: 'AR', label: 'AR Reports', to: '/reports/ar', bar: 'bg-amber-500', tone: 'amber' },
{ key: 'Manufacturing', label: 'Manufacturing Quick Report', to: '/reports/manufacturing', bar: 'bg-teal-500', tone: 'teal' },
{ key: 'Inventory', label: 'Inventory Quick Report', to: '/reports/inventory', bar: 'bg-violet-500', tone: 'violet' },
{ key: 'Custom', label: 'Custom & Shared Reports', to: '/reports/shared', bar: 'bg-blue-500', tone: 'blue' }];


function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { savedReports, schedules, recentlyViewed, favorites, getReport, currentUser } = useApp();
  const { activeSource, totalRecords, nextScheduledRefresh } = useErpConnection();
  const [statusOpen, setStatusOpen] = useState(false);
  const navigate = useNavigate();

  const now = new Date();
  const firstName = currentUser.name.split(/\s+/)[0] || currentUser.name;
  const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* every number below is calculated from the live report lists, so it follows reports being saved, deleted or starred */
  const allReports = useMemo(() => [...standardTemplates, ...savedReports], [savedReports]);
  const standardCount = standardTemplates.length;
  const customCount = savedReports.length;
  const totalReports = standardCount + customCount;
  const favoriteReports = useMemo(
    () => favorites.map((id) => allReports.find((r) => r.id === id)).filter((r) => Boolean(r)) as typeof allReports,
    [favorites, allReports]
  );
  const activeSchedules = schedules.filter((s) => s.status === 'Active').length;
  const pausedSchedules = schedules.length - activeSchedules;

  const recentReports = useMemo(
    () => recentlyViewed.map((id) => getReport(id)).filter((r) => Boolean(r)).slice(0, 6) as typeof allReports,
    [recentlyViewed, getReport]
  );

  const library = SECTIONS.map((section) => ({
    ...section,
    count: allReports.filter((r) => reportSection(r) === section.key).length
  }));
  const libraryMax = Math.max(1, ...library.map((l) => l.count));

  const kpis = [
  {
    label: 'Total Reports',
    value: totalReports,
    caption: 'Standard and custom reports',
    icon: <FileTextIcon className="h-4 w-4" />,
    chip: 'bg-accent-50 text-accent-600',
    edge: 'border-l-accent-500',
    to: '/reports/shared'
  },
  {
    label: 'Standard Reports',
    value: standardCount,
    caption: 'Sales, AR, Manufacturing, Inventory',
    icon: <LayersIcon className="h-4 w-4" />,
    chip: 'bg-blue-50 text-blue-600',
    edge: 'border-l-blue-500',
    to: '/reports/fixed'
  },
  {
    label: 'Custom Reports',
    value: customCount,
    caption: 'Built and saved by your team',
    icon: <PenLineIcon className="h-4 w-4" />,
    chip: 'bg-violet-50 text-violet-600',
    edge: 'border-l-violet-500',
    to: '/reports/shared'
  },
  {
    label: 'Favorites',
    value: favoriteReports.length,
    caption: favoriteReports.length ? 'Pinned for quick access' : 'Star a report to pin it',
    icon: <StarIcon className="h-4 w-4" />,
    chip: 'bg-amber-50 text-amber-600',
    edge: 'border-l-amber-500',
    to: '/favorites'
  },
  {
    label: 'Active Schedules',
    value: activeSchedules,
    caption: pausedSchedules ? `${pausedSchedules} paused` : 'Delivered automatically',
    icon: <CalendarClockIcon className="h-4 w-4" />,
    chip: 'bg-teal-50 text-teal-600',
    edge: 'border-l-teal-500',
    to: '/scheduled'
  }];


  const quickActions = [
  {
    label: 'Open Report Builder',
    description: 'Pick a template or start from a blank canvas.',
    icon: <WrenchIcon className="h-4 w-4" />,
    chip: 'bg-violet-50 text-violet-600',
    to: '/builder'
  },
  {
    label: 'Create Custom Report',
    description: 'Drag ERP fields straight onto an empty report.',
    icon: <FilePlus2Icon className="h-4 w-4" />,
    chip: 'bg-accent-50 text-accent-600',
    to: '/builder/new'
  },
  {
    label: 'Inventory Quick Report',
    description: 'Stock movements by transaction, location and bin.',
    icon: <DatabaseIcon className="h-4 w-4" />,
    chip: 'bg-teal-50 text-teal-600',
    to: '/reports/inventory'
  },
  {
    label: 'Refresh ERP Data',
    description: 'Update record counts and the sync time.',
    icon: <RefreshCwIcon className="h-4 w-4" />,
    chip: 'bg-emerald-50 text-emerald-600',
    to: '/data-refresh'
  }];


  const connected = activeSource.status === 'Connected';

  return (
    <div className="pb-8">
      {/* ---------- welcome banner ---------- */}
      <section className="relative overflow-hidden border-b-2 border-accent-500 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700 px-6 py-5 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent-500/15 blur-3xl" />
        
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-40 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />
        
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-2xs font-medium uppercase tracking-[0.14em] text-slate-400">{today}</p>
            <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight">
              {greeting(now.getHours())}, {firstName}
            </h1>
            <p className="mt-1 text-[13px] text-slate-300">
              Polydime ERP reporting workspace · {totalReports} reports ready to run
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setStatusOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-100 backdrop-blur transition-colors duration-150 hover:bg-white/15">
              
              <span
                className={cx(
                  'inline-block h-2 w-2 rounded-full',
                  connected ? 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]' : 'bg-red-400 shadow-[0_0_0_3px_rgba(248,113,113,0.25)]'
                )}
                aria-hidden />
              
              <span className="font-medium">ERP {activeSource.status}</span>
              <span className="text-slate-300">· Synced {formatDateTime(activeSource.lastDataRefresh)}</span>
            </button>
            <Link
              to="/builder/new"
              className="inline-flex h-9 items-center gap-2 rounded bg-accent-500 px-4 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-accent-600">
              
              <FilePlus2Icon className="h-4 w-4" /> New report
            </Link>
          </div>
        </div>
      </section>

      <ConnectionStatusDialog open={statusOpen} onClose={() => setStatusOpen(false)} />

      {/* ---------- key numbers ---------- */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-4 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((card) =>
        <Link
          key={card.label}
          to={card.to}
          className={cx(
            'group rounded border border-l-[3px] border-line bg-white px-3.5 py-3 shadow-panel transition-all duration-150',
            'hover:-translate-y-px hover:shadow-pop',
            card.edge
          )}>
          
            <div className="flex items-start justify-between">
              <span className="text-2xs font-semibold uppercase tracking-wide text-ink-500">{card.label}</span>
              <span className={cx('flex h-7 w-7 items-center justify-center rounded-md', card.chip)}>{card.icon}</span>
            </div>
            <p className="tabular mt-2 text-[28px] font-semibold leading-none tracking-tight text-ink-900">
              {card.value}
            </p>
            <p className="mt-1.5 truncate text-2xs text-ink-500">{card.caption}</p>
          </Link>
        )}
      </div>

      <div className="grid gap-4 px-5 pt-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* ---------- recent reports ---------- */}
          <Panel
            title="Recent Reports"
            actions={
            <Link to="/reports/shared" className="inline-flex items-center gap-1 text-xs font-medium text-accent-700 hover:underline">
                View all <ArrowRightIcon className="h-3 w-3" />
              </Link>
            }>
            
            {recentReports.length === 0 ?
            <p className="px-4 py-8 text-center text-xs text-ink-500">
                Reports you open appear here so you can jump back to them.
              </p> :

            <table className="w-full">
                <thead>
                  <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-500">
                    <th scope="col" className="px-3 py-2 font-semibold">Report</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Type</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Category</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report) => {
                  const section = SECTIONS.find((s) => s.key === reportSection(report))!;
                  return (
                    <tr
                      key={report.id}
                      className="cursor-pointer border-b border-line/70 text-[13px] transition-colors duration-150 last:border-0 hover:bg-accent-50/50"
                      onClick={() => navigate(reportPath(report))}>
                      
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1.5 font-medium text-ink-900">
                            {favorites.includes(report.id) &&
                          <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                          }
                            {report.name}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={section.tone}>{report.type}</Badge>
                        </td>
                        <td className="px-3 py-2 text-ink-700">{report.category}</td>
                        <td className="px-3 py-2 text-ink-700">{report.owner}</td>
                      </tr>);

                })}
                </tbody>
              </table>
            }
          </Panel>

          {/* ---------- report library ---------- */}
          <Panel title="Report Library" actions={<span className="text-2xs text-ink-500">{totalReports} reports</span>}>
            <ul className="divide-y divide-line/70">
              {library.map((section) =>
              <li key={section.key}>
                  <Link
                  to={section.to}
                  className="flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-surface-muted">
                  
                    <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', section.bar)} aria-hidden />
                    <span className="w-52 shrink-0 truncate text-[13px] font-medium text-ink-900">{section.label}</span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                      <span
                      className={cx('block h-full rounded-full transition-[width] duration-300', section.bar)}
                      style={{ width: `${section.count ? Math.max(8, section.count / libraryMax * 100) : 0}%` }} />
                    
                    </span>
                    <span className="tabular w-6 shrink-0 text-right text-[13px] font-semibold text-ink-900">
                      {section.count}
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          {/* ---------- favorites ---------- */}
          <Panel
            title="Favorites"
            actions={
            <Link to="/favorites" className="inline-flex items-center gap-1 text-xs font-medium text-accent-700 hover:underline">
                Manage <ArrowRightIcon className="h-3 w-3" />
              </Link>
            }>
            
            {favoriteReports.length === 0 ?
            <p className="px-4 py-6 text-center text-xs text-ink-500">
                No favorites yet. Click the star on any report to pin it here.
              </p> :

            <ul className="divide-y divide-line/70">
                {favoriteReports.slice(0, 5).map((report) =>
              <li key={report.id}>
                    <Link
                  to={reportPath(report)}
                  className="flex items-center gap-2.5 px-3 py-2 transition-colors duration-150 hover:bg-amber-50/60">
                  
                      <StarIcon className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink-900">{report.name}</span>
                        <span className="block truncate text-2xs text-ink-500">{report.category}</span>
                      </span>
                    </Link>
                  </li>
              )}
              </ul>
            }
          </Panel>

          {/* ---------- quick actions ---------- */}
          <Panel title="Quick Actions" bodyClassName="p-2">
            <ul className="space-y-1.5">
              {quickActions.map((action) =>
              <li key={action.label}>
                  <Link
                  to={action.to}
                  className={cx(
                    'flex items-center gap-3 rounded border border-line px-2.5 py-2 transition-colors duration-150',
                    'hover:border-accent-300 hover:bg-accent-50/50'
                  )}>
                  
                    <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', action.chip)}>
                      {action.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-ink-900">{action.label}</span>
                      <span className="block truncate text-2xs text-ink-500">{action.description}</span>
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          </Panel>

          {/* ---------- data status ---------- */}
          <Panel
            title="Data Status"
            actions={
            <Link to="/data-refresh" className="inline-flex items-center gap-1 text-xs font-medium text-accent-700 hover:underline">
                Refresh <ArrowRightIcon className="h-3 w-3" />
              </Link>
            }>
            
            <dl className="space-y-2 px-3.5 py-3 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Source</dt>
                <dd className="truncate font-medium text-ink-900">{activeSource.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Status</dt>
                <dd className={cx('flex items-center gap-1.5 font-medium', connected ? 'text-emerald-700' : 'text-red-700')}>
                  <span className={cx('inline-block h-2 w-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-red-500')} aria-hidden />
                  {activeSource.status}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Last refresh</dt>
                <dd className="tabular font-medium text-blue-700">{formatDateTime(activeSource.lastDataRefresh)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Total records</dt>
                <dd className="tabular font-medium text-ink-900">{totalRecords.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-500">Next refresh</dt>
                <dd className="tabular text-right font-medium text-violet-700">{nextScheduledRefresh}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>);

}
