import { CheckCircle2Icon, DatabaseIcon, Loader2Icon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import type { QueryResultMeta } from '../../types/erp';
import { Button } from '../ui/Button';
import { formatDateTime } from '../../utils/format';

interface QueryStatusBarProps {
  meta: QueryResultMeta;
  onRefresh: () => void;
  disabled?: boolean;
}

export function QueryStatusBar({ meta, onRefresh, disabled }: QueryStatusBarProps) {
  const running = meta.state === 'running';

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-line bg-surface-muted px-3 py-1.5">
      <span className="flex items-center gap-1.5 text-2xs text-ink-500">
        <DatabaseIcon className="h-3.5 w-3.5 text-accent-600" />
        <span className="uppercase tracking-wide">Data source</span>
        <span className="font-medium text-ink-900">{meta.dataSource}</span>
        <span
          className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
          aria-label="Connected" />
        
      </span>

      <span className="text-2xs text-ink-500">
        <span className="uppercase tracking-wide">Last updated</span>{' '}
        <span className="tabular font-medium text-ink-900">
          {formatDateTime(meta.completedAt)}
        </span>
      </span>

      <span className="text-2xs text-ink-500">
        <span className="uppercase tracking-wide">Records</span>{' '}
        <span className="tabular font-medium text-ink-900">
          {meta.records.toLocaleString()}
        </span>
      </span>

      <span
        className="flex items-center gap-1.5 text-2xs"
        role="status"
        aria-live="polite">
        
        {running &&
        <>
            <Loader2Icon className="h-3.5 w-3.5 animate-spin text-accent-600" />
            <span className="font-medium text-accent-700">Loading ERP data…</span>
          </>
        }
        {meta.state === 'complete' &&
        <>
            <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-ink-700">
              Query completed ·{' '}
              <span className="tabular">{(meta.executionMs / 1000).toFixed(1)} seconds</span>
            </span>
          </>
        }
        {meta.state === 'error' &&
        <>
            <TriangleAlertIcon className="h-3.5 w-3.5 text-red-600" />
            <span className="text-red-700">Query failed — retry or check the connection</span>
          </>
        }
      </span>

      <Button
        size="sm"
        className="ml-auto"
        disabled={disabled || running}
        icon={<RefreshCwIcon className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />}
        onClick={onRefresh}>
        
        Refresh
      </Button>
    </div>);

}