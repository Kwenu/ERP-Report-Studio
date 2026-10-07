import { ChevronsDownUpIcon, ChevronsUpDownIcon, DatabaseIcon, Loader2Icon, SearchIcon, SlidersHorizontalIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import type { QueryResultMeta, ReportDefinition } from '../../types/erp';
import { formatDateTime } from '../../utils/format';
import { compactInputClass, compactSelectClass } from '../../utils/ui';

interface ReportControlsBarProps {
  definition: ReportDefinition;
  onChange: (patch: Partial<ReportDefinition>) => void;
  meta: QueryResultMeta;
  search: string;
  onSearch: (value: string) => void;
  hasGroups: boolean;
  allCollapsed: boolean;
  onToggleCollapseAll: () => void;
  selectedCount: number;
  requestedAt: Date;
  panelOpen: boolean;
  onOpenPanel: () => void;
}

const label = 'whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-ink-500';

/**
 * ONE slim row: date range · basis · group by · search · query status.
 * (Replaces the separate date row, status bar and search row, which together took ~3 rows.)
 */
export function ReportControlsBar({
  definition,
  onChange,
  meta,
  search,
  onSearch,
  hasGroups,
  allCollapsed,
  onToggleCollapseAll,
  selectedCount,
  requestedAt,
  panelOpen,
  onOpenPanel
}: ReportControlsBarProps) {
  const running = meta.state === 'running';

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-white px-3 py-1">
        {definition.dateFrom !== undefined &&
        <div className="flex items-center gap-1">
            <span className={label}>Dates</span>
            <input
            type="date"
            aria-label="From date"
            value={definition.dateFrom ?? ''}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
            className={`${compactInputClass} w-[116px]`} />
          
            <span className="text-[11px] text-ink-500">to</span>
            <input
            type="date"
            aria-label="To date"
            value={definition.dateTo ?? ''}
            onChange={(e) => onChange({ dateTo: e.target.value })}
            className={`${compactInputClass} w-[116px]`} />
          
          </div>
        }
        {definition.basis &&
        <div className="flex items-center gap-1">
            <span className={label}>Basis</span>
            <div className="flex overflow-hidden rounded border border-line">
              {(['Accrual', 'Cash'] as const).map((basis) =>
            <button
              key={basis}
              type="button"
              onClick={() => onChange({ basis })}
              className={
              definition.basis === basis ?
              'h-6 bg-accent-500 px-2 text-[11px] font-medium text-white' :
              'h-6 bg-white px-2 text-[11px] text-ink-700 transition-colors duration-150 hover:bg-surface-muted'
              }>
              
                  {basis}
                </button>
            )}
            </div>
          </div>
        }
        <div className="flex items-center gap-1">
          <span className={label}>Group by</span>
          <select
            aria-label="Group by"
            value={definition.groupBy ?? ''}
            onChange={(e) => onChange({ groupBy: e.target.value || null })}
            className={`${compactSelectClass} w-[140px]`}>
            
            <option value="">No grouping</option>
            <option value="name">Customer</option>
            <option value="rep">Sales Representative</option>
            <option value="item">Item</option>
            <option value="date">Date</option>
            <option value="terms">Terms</option>
            <option value="category">Category</option>
          </select>
        </div>

        <div className="relative w-44">
          <SearchIcon className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-400" />
          <input
            className={`${compactInputClass} w-full pl-6`}
            placeholder="Search within report…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            aria-label="Search within report" />
          
        </div>

        {hasGroups &&
        <Button
          size="xs"
          icon={allCollapsed ? <ChevronsUpDownIcon className="h-3 w-3" /> : <ChevronsDownUpIcon className="h-3 w-3" />}
          onClick={onToggleCollapseAll}>
          
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </Button>
        }
        {selectedCount > 0 &&
        <span className="text-2xs text-accent-700">
            {selectedCount} row{selectedCount === 1 ? '' : 's'} selected
          </span>
        }

        <div
          className="ml-auto flex items-center gap-3 text-[11px] text-ink-500"
          role="status"
          aria-live="polite"
          title={meta.completedAt ? `Last updated ${formatDateTime(meta.completedAt)}` : undefined}>
          
          <span className="flex items-center gap-1">
            <DatabaseIcon className="h-3 w-3 text-accent-600" />
            <span className="font-medium text-ink-900">{meta.dataSource}</span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="Connected" />
          </span>
          <span>
            <span className="tabular font-medium text-ink-900">{meta.records.toLocaleString()}</span> records
            {meta.truncated && <span className="ml-1 text-amber-700">(first 20,000 — narrow the dates)</span>}
          </span>
          {running &&
          <span className="flex items-center gap-1 font-medium text-accent-700">
              <Loader2Icon className="h-3 w-3 animate-spin" /> Loading…
            </span>
          }
          {meta.state === 'complete' &&
          <span className="tabular">{(meta.executionMs / 1000).toFixed(1)}s · {requestedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          }
          {meta.state === 'error' &&
          <span className="flex items-center gap-1 font-medium text-red-700">
              <TriangleAlertIcon className="h-3 w-3" /> Query failed
            </span>
          }
          {!panelOpen &&
          <Button size="xs" icon={<SlidersHorizontalIcon className="h-3 w-3" />} onClick={onOpenPanel}>
              Configure
            </Button>
          }
        </div>
      </div>

      {meta.state === 'error' &&
      <p className="border-b border-red-200 bg-red-50 px-3 py-1 text-[11px] text-red-700">
          {meta.error ?? 'Query failed — retry or check the connection.'}
        </p>
      }
    </>);

}
