import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MoreHorizontalIcon, SearchIcon, StarIcon } from 'lucide-react';
import type { ReportDefinition } from '../../types/erp';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { useApp } from '../../contexts/AppContext';
import { relativeTime } from '../../utils/format';
import { inputClass, cx } from '../../utils/ui';

interface ReportListProps {
  reports: ReportDefinition[];
  emptyTitle: string;
  emptyDescription: string;
  showActions?: boolean;
}

export function ReportList({
  reports,
  emptyTitle,
  emptyDescription,
  showActions = true
}: ReportListProps) {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, duplicateReport, deleteReport, renameReport } = useApp();
  const [query, setQuery] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const filtered = reports.filter(
    (r) =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.category.toLowerCase().includes(query.toLowerCase()) ||
    r.owner.toLowerCase().includes(query.toLowerCase())
  );

  const openReport = (report: ReportDefinition) =>
  navigate(
    report.type === 'Fixed Template' ?
    `/reports/fixed/${report.id}` :
    `/reports/view/${report.id}`
  );

  return (
    <div className="rounded border border-line bg-white shadow-panel">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <div className="relative w-72">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            className={`${inputClass} h-7 pl-7 text-xs`}
            placeholder="Filter by name, category or owner…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter reports" />
          
        </div>
        <p className="ml-auto text-2xs text-ink-500">{filtered.length} reports</p>
      </div>

      {filtered.length === 0 ?
      <EmptyState
        icon={<SearchIcon className="h-5 w-5" />}
        title={emptyTitle}
        description={emptyDescription} /> :


      <table className="w-full">
          <thead>
            <tr className="border-b border-line bg-surface-muted text-left text-2xs uppercase tracking-wide text-ink-500">
              <th scope="col" className="w-8 px-2 py-1.5" />
              <th scope="col" className="px-3 py-1.5 font-semibold">Report Name</th>
              <th scope="col" className="px-3 py-1.5 font-semibold">Type</th>
              <th scope="col" className="px-3 py-1.5 font-semibold">Category</th>
              <th scope="col" className="px-3 py-1.5 font-semibold">Created By</th>
              <th scope="col" className="px-3 py-1.5 font-semibold">Visibility</th>
              <th scope="col" className="px-3 py-1.5 font-semibold">Last Modified</th>
              <th scope="col" className="px-3 py-1.5 font-semibold">Last Run</th>
              {showActions && <th scope="col" className="w-10 px-2 py-1.5" />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((report) =>
          <tr
            key={report.id}
            className="border-b border-line/70 text-[13px] transition-colors duration-150 hover:bg-accent-50/40">
            
                <td className="px-2 py-1.5">
                  <button
                type="button"
                aria-label={`Toggle favourite for ${report.name}`}
                onClick={() => toggleFavorite(report.id)}
                className="rounded p-0.5">
                
                    <StarIcon
                  className={cx(
                    'h-3.5 w-3.5',
                    favorites.includes(report.id) ?
                    'fill-amber-400 text-amber-400' :
                    'text-ink-400'
                  )} />
                
                  </button>
                </td>
                <td className="px-3 py-1.5">
                  <button
                type="button"
                onClick={() => openReport(report)}
                className="text-left font-medium text-accent-700 hover:underline">
                
                    {report.name}
                  </button>
                  <p className="truncate text-2xs text-ink-500">{report.description}</p>
                </td>
                <td className="px-3 py-1.5">
                  <Badge tone={report.type === 'Fixed Template' ? 'navy' : 'blue'}>
                    {report.type}
                  </Badge>
                </td>
                <td className="px-3 py-1.5 text-ink-700">{report.category}</td>
                <td className="px-3 py-1.5 text-ink-700">{report.createdBy}</td>
                <td className="px-3 py-1.5 text-ink-700">{report.visibility}</td>
                <td className="px-3 py-1.5 text-ink-500">
                  {relativeTime(report.lastModified)}
                </td>
                <td className="px-3 py-1.5 text-ink-500">{relativeTime(report.lastRun)}</td>
                {showActions &&
            <td className="relative px-2 py-1.5">
                    <button
                type="button"
                aria-label={`Actions for ${report.name}`}
                onClick={() => setMenuFor(menuFor === report.id ? null : report.id)}
                className="rounded p-1 text-ink-500 transition-colors duration-150 hover:bg-surface-sunken hover:text-ink-900">
                
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </button>
                    {menuFor === report.id &&
              <div className="absolute right-2 top-8 z-30 w-40 rounded border border-line bg-white py-1 text-xs shadow-pop">
                        {[
                { label: 'Open', run: () => openReport(report) },
                { label: 'Edit', run: () => openReport(report) },
                {
                  label: 'Duplicate',
                  run: () => {
                    const copy = duplicateReport(report.id);
                    if (copy) toast.success(`Duplicated as “${copy.name}”`);
                  }
                },
                {
                  label: 'Rename',
                  run: () => {
                    const name = window.prompt('Rename report', report.name);
                    if (name) {
                      renameReport(report.id, name);
                      toast.success('Report renamed');
                    }
                  }
                },
                {
                  label: 'Share',
                  run: () => toast.success('Sharing link copied to clipboard')
                },
                {
                  label: 'Export',
                  run: () => openReport(report)
                },
                {
                  label: 'Delete',
                  run: () => {
                    deleteReport(report.id);
                    toast.success('Report deleted');
                  }
                }].
                map((action) =>
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    action.run();
                    setMenuFor(null);
                  }}
                  className={cx(
                    'block w-full px-3 py-1.5 text-left transition-colors duration-150 hover:bg-surface-muted',
                    action.label === 'Delete' ? 'text-red-700' : 'text-ink-700',
                    report.type === 'Fixed Template' &&
                    ['Delete', 'Rename'].includes(action.label) &&
                    'pointer-events-none opacity-40'
                  )}>
                  
                            {action.label}
                          </button>
                )}
                      </div>
              }
                  </td>
            }
              </tr>
          )}
          </tbody>
        </table>
      }
    </div>);

}