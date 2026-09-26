import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  DatabaseIcon,
  FilePlus2Icon,
  FileTextIcon,
  LayersIcon,
  StarIcon,
  TableIcon,
  WrenchIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { ConnectionStatusDialog } from '../components/data/ConnectionStatusDialog';
import { useApp } from '../contexts/AppContext';
import { useErpConnection } from '../contexts/ErpConnectionContext';
import { fixedTemplates } from '../data/templates';
import { formatClock, relativeTime } from '../utils/format';
import { cx } from '../utils/ui';

export function Dashboard() {
  const { savedReports, schedules, recentlyViewed, favorites, getReport, audit } = useApp();
  const { activeSource } = useErpConnection();
  const [statusOpen, setStatusOpen] = useState(false);
  const navigate = useNavigate();

  const totalReports = fixedTemplates.length + savedReports.length;
  const summary = [
  { label: 'Total Reports', value: totalReports, icon: <FileTextIcon className="h-4 w-4" />, to: '/reports/mine' },
  { label: 'Fixed Reports', value: fixedTemplates.length, icon: <LayersIcon className="h-4 w-4" />, to: '/reports/fixed' },
  { label: 'Custom Reports', value: savedReports.length, icon: <WrenchIcon className="h-4 w-4" />, to: '/reports/mine' },
  { label: 'Recently Viewed', value: recentlyViewed.length, icon: <ClockIcon className="h-4 w-4" />, to: '/reports/mine' },
  { label: 'Scheduled Reports', value: schedules.filter((s) => s.status === 'Active').length, icon: <StarIcon className="h-4 w-4" />, to: '/scheduled' }];


  const recentIds = [
  'sales-by-customer-detail',
  'average-days-to-pay',
  'sales-by-rep-detail',
  'open-invoices',
  'custom-sales-analysis',
  'customer-outstanding'];


  const quickActions = [
  {
    label: 'Open Report Builder',
    description: 'Pick a template or start from a blank canvas.',
    icon: <WrenchIcon className="h-4 w-4" />,
    to: '/builder'
  },
  {
    label: 'Create Custom Report',
    description: 'Drag ERP fields straight onto an empty report.',
    icon: <FilePlus2Icon className="h-4 w-4" />,
    to: '/builder/new'
  },
  {
    label: 'Browse ERP Tables',
    description: '17 tables and 96 reportable fields catalogued.',
    icon: <TableIcon className="h-4 w-4" />,
    to: '/tables'
  },
  {
    label: 'View Fixed Reports',
    description: 'The four standard accounting reports.',
    icon: <DatabaseIcon className="h-4 w-4" />,
    to: '/reports/fixed'
  }];


  return (
    <div className="pb-8">
      <PageHeader
        title="Reporting Overview"
        subtitle={
        <span className="flex flex-wrap items-center gap-2">
            <span>Polydime ERP · Reporting period April – May 2023</span>
            <button
            type="button"
            onClick={() => setStatusOpen(true)}
            className="inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-2xs font-medium text-emerald-800 transition-colors duration-150 hover:border-emerald-300 hover:bg-emerald-100">
            
              <span
              className={cx(
                'inline-block h-1.5 w-1.5 rounded-full',
                activeSource.status === 'Connected' ? 'bg-emerald-500' : 'bg-red-500'
              )}
              aria-hidden />
            
              ERP {activeSource.status}
              <span className="font-normal text-emerald-700">
                · Data synced {formatClock(activeSource.lastDataRefresh)} today
              </span>
            </button>
          </span>
        } />
      

      <ConnectionStatusDialog open={statusOpen} onClose={() => setStatusOpen(false)} />

      <div className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-3 xl:grid-cols-5">
        {summary.map((card) =>
        <Link
          key={card.label}
          to={card.to}
          className="rounded border border-line bg-white px-3 py-2.5 shadow-panel transition-colors duration-150 hover:border-accent-300">
          
            <div className="flex items-center justify-between text-ink-400">
              <span className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                {card.label}
              </span>
              {card.icon}
            </div>
            <p className="tabular mt-1.5 text-2xl font-semibold leading-none text-ink-900">
              {card.value}
            </p>
          </Link>
        )}
      </div>

      <div className="grid gap-4 px-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Recent Reports"
          actions={
          <Link
            to="/reports/mine"
            className="text-xs font-medium text-accent-700 hover:underline">
            
              View all
            </Link>
          }>
          
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-3 py-1.5 font-semibold">Report</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Type</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Category</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Owner</th>
                <th scope="col" className="px-3 py-1.5 text-right font-semibold">Last run</th>
              </tr>
            </thead>
            <tbody>
              {recentIds.map((id) => {
                const report = getReport(id);
                if (!report) return null;
                const isFixed = report.type === 'Fixed Template';
                return (
                  <tr
                    key={id}
                    className="cursor-pointer border-b border-line/70 text-[13px] transition-colors duration-150 hover:bg-accent-50/50"
                    onClick={() =>
                    navigate(isFixed ? `/reports/fixed/${report.id}` : `/reports/view/${report.id}`)
                    }>
                    
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-1.5 font-medium text-ink-900">
                        {favorites.includes(report.id) &&
                        <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                        }
                        {report.name}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge tone={isFixed ? 'navy' : 'blue'}>{report.type}</Badge>
                    </td>
                    <td className="px-3 py-1.5 text-ink-700">{report.category}</td>
                    <td className="px-3 py-1.5 text-ink-700">{report.owner}</td>
                    <td className="px-3 py-1.5 text-right text-ink-500">
                      {relativeTime(report.lastRun)}
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </Panel>

        <div className="space-y-4">
          <Panel title="Quick Actions" bodyClassName="p-2">
            <ul className="space-y-1.5">
              {quickActions.map((action) =>
              <li key={action.label}>
                  <Link
                  to={action.to}
                  className={cx(
                    'flex items-start gap-2.5 rounded border border-line px-2.5 py-2 transition-colors duration-150',
                    'hover:border-accent-300 hover:bg-accent-50/60'
                  )}>
                  
                    <span className="mt-0.5 text-accent-600">{action.icon}</span>
                    <span>
                      <span className="block text-[13px] font-medium text-ink-900">
                        {action.label}
                      </span>
                      <span className="block text-2xs text-ink-500">
                        {action.description}
                      </span>
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          </Panel>

          <Panel title="Latest Activity">
            <ul className="divide-y divide-line">
              {audit.slice(0, 5).map((entry) =>
              <li key={entry.id} className="px-3 py-1.5">
                  <p className="text-xs text-ink-900">{entry.action}</p>
                  <p className="text-2xs text-ink-500">
                    {entry.user} · {entry.report} · {relativeTime(entry.timestamp)}
                  </p>
                </li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </div>);

}