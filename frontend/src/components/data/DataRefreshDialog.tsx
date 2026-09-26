import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, CircleIcon, Loader2Icon, RefreshCwIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { API_BASE, refreshData, type DataRefreshResult } from '../../services/erpApi';
import type { RefreshMode } from '../../types/erp';
import { formatClock, formatDuration } from '../../utils/format';
import { cx } from '../../utils/ui';

interface DataRefreshDialogProps {
  open: boolean;
  onClose: () => void;
  sourceId: string;
  tables: string[];
  mode: RefreshMode;
  sourceName: string;
  onTableStatus: (table: string, status: 'Refreshing' | 'Current') => void;
  onComplete: (result: DataRefreshResult) => void;
}

type RowState = 'queued' | 'refreshing' | 'done';

export function DataRefreshDialog({
  open,
  onClose,
  sourceId,
  tables,
  mode,
  sourceName,
  onTableStatus,
  onComplete
}: DataRefreshDialogProps) {
  const [states, setStates] = useState<Record<string, RowState>>({});
  const [updated, setUpdated] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DataRefreshResult | null>(null);

  const run = useCallback(async () => {
    setStates(Object.fromEntries(tables.map((t) => [t, 'queued' as RowState])));
    setUpdated({});
    setResult(null);
    setRunning(true);
    const outcome = await refreshData(sourceId, tables, mode, (table, status, tableOutcome) => {
      setStates((prev) => ({
        ...prev,
        [table]: status === 'refreshing' ? 'refreshing' : 'done'
      }));
      onTableStatus(table, status === 'refreshing' ? 'Refreshing' : 'Current');
      if (tableOutcome)
      setUpdated((prev) => ({ ...prev, [table]: tableOutcome.recordsUpdated }));
    });
    setRunning(false);
    setResult(outcome);
    onComplete(outcome);
  }, [sourceId, tables, mode, onTableStatus, onComplete]);

  useEffect(() => {
    if (open) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const done = tables.filter((t) => states[t] === 'done').length;
  const percent = tables.length ? Math.round(done / tables.length * 100) : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={running ? 'Refreshing ERP data…' : 'Data refresh'}
      description={`${sourceName} · ${mode} refresh · ${tables.length} table${
      tables.length === 1 ? '' : 's'}`
      }
      footer={
      <>
          <Button onClick={onClose} disabled={running}>
            Close
          </Button>
          <Button
          variant="primary"
          disabled={running}
          icon={<RefreshCwIcon className="h-3.5 w-3.5" />}
          onClick={() => void run()}>
          
            Run again
          </Button>
        </>
      }>
      
      <div className="space-y-3">
        <p className="rounded border border-line bg-surface-muted px-2.5 py-1.5 font-mono text-2xs text-ink-500">
          POST {API_BASE}/datasources/{'{id}'}/data/refresh — mode={mode.toLowerCase()}
        </p>

        <div>
          <div className="mb-1 flex items-center justify-between text-2xs text-ink-500">
            <span>
              {done} of {tables.length} tables
            </span>
            <span className="tabular">{percent}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded bg-surface-sunken"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}>
            
            <div
              className="h-full bg-accent-500 transition-[width] duration-200 ease-out"
              style={{ width: `${percent}%` }} />
            
          </div>
        </div>

        <ul className="divide-y divide-line rounded border border-line">
          {tables.map((table) => {
            const state = states[table] ?? 'queued';
            return (
              <li
                key={table}
                className="flex items-center gap-2.5 px-3 py-1.5 text-[13px]">
                
                <span className="shrink-0">
                  {state === 'done' && <CheckIcon className="h-4 w-4 text-emerald-600" />}
                  {state === 'refreshing' &&
                  <Loader2Icon className="h-4 w-4 animate-spin text-accent-600" />
                  }
                  {state === 'queued' && <CircleIcon className="h-4 w-4 text-ink-400" />}
                </span>
                <span
                  className={cx(
                    'min-w-0 flex-1 truncate',
                    state === 'queued' ? 'text-ink-400' : 'text-ink-900'
                  )}>
                  
                  {table}
                </span>
                <span className="tabular shrink-0 text-2xs text-ink-500">
                  {state === 'done' ?
                  `${(updated[table] ?? 0).toLocaleString()} updated` :
                  state === 'refreshing' ?
                  'Extracting…' :
                  'Queued'}
                </span>
              </li>);

          })}
        </ul>

        {result &&
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[13px] font-semibold text-emerald-800">
              Data refresh completed successfully.
            </p>
            <dl className="mt-1.5 grid grid-cols-3 gap-2 text-xs text-emerald-800">
              <div>
                <dt className="text-2xs uppercase tracking-wide text-emerald-700">
                  Records updated
                </dt>
                <dd className="tabular font-semibold">
                  {result.recordsUpdated.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-emerald-700">Duration</dt>
                <dd className="tabular font-semibold">
                  {formatDuration(Math.round(result.durationMs / 1000))}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-emerald-700">
                  Last refresh
                </dt>
                <dd className="tabular font-semibold">
                  {formatClock(result.completedAt)}
                </dd>
              </div>
            </dl>
          </div>
        }
      </div>
    </Modal>);

}