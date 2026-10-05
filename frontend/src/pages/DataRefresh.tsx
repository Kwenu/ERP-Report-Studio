import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2Icon, ClockIcon, RefreshCwIcon, SearchIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field } from '../components/ui/Field';
import { DataRefreshDialog } from '../components/data/DataRefreshDialog';
import { useErpConnection } from '../contexts/ErpConnectionContext';
import { useApp, canDesign } from '../contexts/AppContext';
import type { RefreshMode, RefreshSchedule, TableRefreshStatus } from '../types/erp';
import { formatClock, formatDateTime, formatDuration } from '../utils/format';
import { inputClass, selectClass, cx } from '../utils/ui';

/* The tables behind the three report views (invoices, customers, items, reps, receipts).
 * They are pinned to the top and pre-selected; every other table of the ERP is listed below them. */
const CORE_TABLES = ['fInvhed', 'fInvdet', 'fDebtor', 'fItems', 'fSalRep', 'fDRecHed', 'fdrecdet'];
const isCore = (name: string) => CORE_TABLES.some((c) => c.toLowerCase() === name.toLowerCase());
const PAGE = 100;

const statusTone: Record<TableRefreshStatus, 'green' | 'amber' | 'blue' | 'neutral' | 'red'> = {
  Current: 'green',
  Stale: 'amber',
  Refreshing: 'blue',
  Queued: 'neutral',
  Failed: 'red'
};

export function DataRefresh() {
  const {
    activeSource,
    tableStates,
    setTableStatus,
    applyDataRefresh,
    lastRefreshResult,
    totalRecords,
    tablesLoading,
    tablesError,
    reloadTables,
    schedule,
    setSchedule,
    nextScheduledRefresh
  } = useErpConnection();
  const { currentUser, logAction } = useApp();
  const canRefresh = canDesign(currentUser.role);

  const [mode, setMode] = useState<RefreshMode>('Incremental');
  const [selected, setSelected] = useState<string[]>([]);
  const [running, setRunning] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<RefreshSchedule>(schedule);
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(PAGE);

  // Core tables first, then every other table alphabetically.
  const ordered = useMemo(
    () => [
    ...tableStates.filter((t) => isCore(t.table)),
    ...tableStates.filter((t) => !isCore(t.table))],
    [tableStates]
  );

  // Pre-select the core tables once the real list has loaded (and again if the data source changes).
  const preselected = useRef<string>('');
  useEffect(() => {
    if (!ordered.length || preselected.current === activeSource.id) return;
    preselected.current = activeSource.id;
    setSelected(ordered.filter((t) => isCore(t.table)).map((t) => t.table));
  }, [ordered, activeSource.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? ordered.filter((t) => t.table.toLowerCase().includes(q)) : ordered;
  }, [ordered, search]);
  const visible = filtered.slice(0, shown);
  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selected.includes(t.table));

  const start = (tables: string[]) => {
    if (!tables.length) {
      toast.error('Select at least one table to refresh.');
      return;
    }
    setRunning(tables);
  };

  return (
    <div className="pb-8">
      <PageHeader
        title="Data Refresh"
        breadcrumb={['Data Sources']}
        subtitle="Pull updated records from the ERP database through the backend extract job."
        actions={
        <>
            <Button
            disabled={!canRefresh}
            icon={<RefreshCwIcon className="h-3.5 w-3.5" />}
            onClick={() => start(selected)}>
            
              Refresh Selected
            </Button>
            <Button
            variant="primary"
            disabled={!canRefresh}
            icon={<RefreshCwIcon className="h-3.5 w-3.5" />}
            onClick={() => start(ordered.map((t) => t.table))}>
            
              Refresh All
            </Button>
          </>
        } />
      

      <div className="grid gap-4 px-5 py-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel title={activeSource.name}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3 text-[13px] md:grid-cols-4">
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">Status</dt>
                <dd className={cx('flex items-center gap-1.5 font-medium', activeSource.status === 'Connected' ? 'text-emerald-700' : 'text-red-700')}>
                  <span className={cx('inline-block h-2 w-2 rounded-full', activeSource.status === 'Connected' ? 'bg-emerald-500' : 'bg-red-500')} aria-hidden />
                  {activeSource.status}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">
                  Last Data Refresh
                </dt>
                <dd className="tabular text-ink-900">
                  {formatDateTime(activeSource.lastDataRefresh)}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">Total Records</dt>
                <dd className="tabular text-ink-900">{totalRecords.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">
                  Next scheduled refresh
                </dt>
                <dd className="tabular text-ink-900">{nextScheduledRefresh}</dd>
              </div>
            </dl>

            <fieldset className="flex flex-wrap items-center gap-5 border-t border-line bg-surface-muted px-4 py-2.5">
              <legend className="sr-only">Refresh mode</legend>
              {(['Incremental', 'Full'] as RefreshMode[]).map((option) =>
              <label
                key={option}
                className="flex cursor-pointer items-start gap-2 text-xs text-ink-700">
                
                  <input
                  type="radio"
                  name="refresh-mode"
                  className="mt-0.5 accent-accent-500"
                  checked={mode === option}
                  onChange={() => setMode(option)} />
                
                  <span>
                    <span className="block font-medium text-ink-900">{option} Refresh</span>
                    <span className="block text-2xs text-ink-500">
                      {option === 'Incremental' ?
                    'Only records changed since the previous refresh.' :
                    'Retrieve the complete selected dataset.'}
                    </span>
                  </span>
                </label>
              )}
              <span className="ml-auto text-2xs text-ink-500">
                {selected.length} of {ordered.length.toLocaleString()} tables selected
              </span>
            </fieldset>
          </Panel>

          <Panel title={`Tables${ordered.length ? ` (${filtered.length.toLocaleString()}${filtered.length !== ordered.length ? ` of ${ordered.length.toLocaleString()}` : ''})` : ''}`}>
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <SearchIcon className="h-3.5 w-3.5 text-ink-400" aria-hidden />
              <input
                className={cx(inputClass, 'max-w-xs')}
                placeholder="Search tables…"
                aria-label="Search tables"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShown(PAGE);
                }} />
              
              <span className="ml-auto text-2xs text-ink-500">
                Record counts are read from the database catalogue.
              </span>
            </div>
            {tablesLoading && !ordered.length &&
            <p className="px-4 py-8 text-center text-xs text-ink-500">Loading tables from the ERP database…</p>
            }
            {tablesError &&
            <div role="alert" className="m-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <p className="font-semibold">Could not load the table list.</p>
                <p>{tablesError}</p>
                <Button size="sm" className="mt-2" onClick={() => void reloadTables()}>
                  Try again
                </Button>
              </div>
            }
            {!tablesLoading && !tablesError && !ordered.length &&
            <p className="px-4 py-8 text-center text-xs text-ink-500">
                No tables to show. Add a data source (Data Sources) and make sure it is connected.
              </p>
            }
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-left text-2xs uppercase tracking-wide text-ink-500">
                  <th scope="col" className="w-9 px-3 py-1.5">
                    <input
                      type="checkbox"
                      aria-label="Select all tables"
                      className="h-3.5 w-3.5 accent-accent-500"
                      checked={allFilteredSelected}
                      onChange={(e) => {
                        const names = filtered.map((t) => t.table);
                        setSelected((prev) =>
                        e.target.checked ?
                        [...new Set([...prev, ...names])] :
                        prev.filter((t) => !names.includes(t))
                        );
                      }} />
                    
                  </th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">Table</th>
                  <th scope="col" className="px-3 py-1.5 text-right font-semibold">
                    Record Count
                  </th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">Last Refresh</th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-1.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((table) =>
                <tr
                  key={table.table}
                  className={cx(
                    'border-b border-line/70 text-[13px] transition-colors duration-150 hover:bg-accent-50/40',
                    isCore(table.table) && 'font-medium'
                  )}>
                  
                    <td className="px-3 py-1.5">
                      <input
                      type="checkbox"
                      aria-label={`Select ${table.table}`}
                      className="h-3.5 w-3.5 accent-accent-500"
                      checked={selected.includes(table.table)}
                      onChange={(e) =>
                      setSelected((prev) =>
                      e.target.checked ?
                      [...prev, table.table] :
                      prev.filter((t) => t !== table.table)
                      )
                      } />
                    
                    </td>
                    <td className="px-3 py-1.5 text-ink-900">{table.table}</td>
                    <td className="tabular px-3 py-1.5 text-right text-ink-700">
                      {table.records.toLocaleString()}
                    </td>
                    <td className="tabular px-3 py-1.5 text-ink-500">
                      {formatDateTime(table.lastRefresh)}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge tone={statusTone[table.status]}>
                        {table.status === 'Current' && '✓ '}
                        {table.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Button
                      size="sm"
                      disabled={!canRefresh}
                      onClick={() => start([table.table])}>
                      
                        Refresh
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {filtered.length > visible.length &&
            <div className="flex items-center justify-center gap-3 border-t border-line bg-surface-muted px-3 py-2 text-xs text-ink-500">
                <span>
                  Showing {visible.length.toLocaleString()} of {filtered.length.toLocaleString()} tables
                </span>
                <Button size="sm" onClick={() => setShown((n) => n + PAGE)}>
                  Show {Math.min(PAGE, filtered.length - visible.length)} more
                </Button>
                <Button size="sm" onClick={() => setShown(filtered.length)}>
                  Show all
                </Button>
              </div>
            }
            {search && filtered.length === 0 &&
            <p className="px-4 py-6 text-center text-xs text-ink-500">No table matches “{search}”.</p>
            }
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title={
            <span className="flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4 text-accent-600" /> Refresh Schedule
              </span>
            }>
            
            <div className="space-y-3 p-3">
              <Field label="Frequency">
                <select
                  className={selectClass}
                  value={draft.frequency}
                  onChange={(e) =>
                  setDraft({
                    ...draft,
                    frequency: e.target.value as RefreshSchedule['frequency']
                  })
                  }>
                  
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Manual</option>
                </select>
              </Field>
              <Field label="Time">
                <input
                  type="time"
                  className={selectClass}
                  value={draft.time}
                  disabled={draft.frequency === 'Manual'}
                  onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
                
              </Field>
              <Field label="Timezone">
                <select
                  className={selectClass}
                  value={draft.timezone}
                  onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}>
                  
                  <option>Company timezone (Asia/Colombo, GMT+5:30)</option>
                  <option>UTC</option>
                </select>
              </Field>
              <Field label="Tables">
                <select
                  className={selectClass}
                  value={draft.scope}
                  onChange={(e) =>
                  setDraft({
                    ...draft,
                    scope: e.target.value as RefreshSchedule['scope'],
                    tables: e.target.value === 'All Tables' ? [] : selected
                  })
                  }>
                  
                  <option>All Tables</option>
                  <option>Selected Tables</option>
                </select>
              </Field>
              <Button
                variant="primary"
                className="w-full"
                disabled={!canRefresh}
                onClick={() => {
                  setSchedule(draft);
                  logAction(
                    `Refresh schedule saved (${draft.frequency}${
                    draft.frequency === 'Manual' ? '' : `, ${draft.time}`})`,

                    '—',
                    activeSource.name
                  );
                  toast.success('Refresh schedule saved');
                }}>
                
                Save Schedule
              </Button>
              <p className="rounded border border-line bg-surface-muted px-2.5 py-2 text-2xs text-ink-500">
                Next scheduled refresh:{' '}
                <span className="font-medium text-ink-900">{nextScheduledRefresh}</span>
              </p>
            </div>
          </Panel>

          <Panel title="Last refresh result">
            {lastRefreshResult ?
            <dl className="space-y-2 px-4 py-3 text-[13px]">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2Icon className="h-4 w-4" />
                  <span className="font-medium">Completed successfully</span>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">Mode</dt>
                  <dd className="text-ink-900">{lastRefreshResult.mode}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">Records updated</dt>
                  <dd className="tabular text-ink-900">
                    {lastRefreshResult.recordsUpdated.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">Duration</dt>
                  <dd className="tabular text-ink-900">
                    {formatDuration(Math.round(lastRefreshResult.durationMs / 1000))}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">Finished</dt>
                  <dd className="tabular text-ink-900">
                    {formatClock(lastRefreshResult.completedAt)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">Tables</dt>
                  <dd className="tabular text-ink-900">{lastRefreshResult.tables.length}</dd>
                </div>
              </dl> :

            <p className="px-4 py-6 text-center text-xs text-ink-500">
                No refresh has been run in this session. The last scheduled extract finished
                at {formatClock(activeSource.lastDataRefresh)}.
              </p>
            }
          </Panel>
        </div>
      </div>

      {running &&
      <DataRefreshDialog
        open={Boolean(running)}
        onClose={() => setRunning(null)}
        sourceId={activeSource.id}
        tables={running}
        mode={mode}
        sourceName={activeSource.name}
        onTableStatus={(table, status) => setTableStatus(table, status)}
        onComplete={(result) => {
          applyDataRefresh(result);
          logAction(
            `ERP data refreshed (${result.mode}) — ${result.recordsUpdated.toLocaleString()} records across ${result.tables.length} tables`,
            '—',
            activeSource.name
          );
          toast.success(
            `Data refresh completed · ${result.recordsUpdated.toLocaleString()} records updated`
          );
        }} />

      }
    </div>);

}