import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  Loader2Icon,
  SearchIcon,
  SlidersHorizontalIcon } from
'lucide-react';
import type { ErpField, ReportColumn, ReportDefinition } from '../../types/erp';
import { columnFromField, getTemplate, cloneDefinition } from '../../data/templates';
import {
  aggregate,
  applyFilters,
  applySort,
  groupRows,
  type GroupBlock } from
'../../utils/reportEngine';
import { ReportHeading } from './ReportHeading';
import { ReportToolbar } from './ReportToolbar';
import { FilterChips } from './FilterChips';
import { ReportTable } from './ReportTable';
import { ConfigPanel, type ConfigTab } from './ConfigPanel';
import { AddFieldDialog } from './AddFieldDialog';
import { SaveAsDialog } from './SaveAsDialog';
import { ScheduleDialog } from './ScheduleDialog';
import { ColumnManagerDialog } from './ColumnManagerDialog';
import { QueryStatusBar } from './QueryStatusBar';
import { Button } from '../ui/Button';
import { useApp, canDesign } from '../../contexts/AppContext';
import { useErpConnection } from '../../contexts/ErpConnectionContext';
import { useErpQuery } from '../../hooks/useErpQuery';
import { exportCsv, exportExcel, exportPdf } from '../../utils/exporter';
import { inputClass, selectClass } from '../../utils/ui';

const pageSizes = [25, 50, 100, 250, 500];

function paginateGroups(groups: GroupBlock[], pageSize: number): GroupBlock[][] {
  const pages: GroupBlock[][] = [];
  let current: GroupBlock[] = [];
  let count = 0;
  groups.forEach((group) => {
    if (count > 0 && count + group.rows.length > pageSize) {
      pages.push(current);
      current = [];
      count = 0;
    }
    current.push(group);
    count += group.rows.length;
  });
  if (current.length) pages.push(current);
  return pages.length ? pages : [[]];
}

interface ReportWorkspaceProps {
  definition: ReportDefinition;
  onDefinitionChange: (definition: ReportDefinition) => void;
  isTemplate: boolean;
  defaultPanelOpen?: boolean;
  emptyState?: React.ReactNode;
}

export function ReportWorkspace({
  definition,
  onDefinitionChange,
  isTemplate,
  defaultPanelOpen = false,
  emptyState
}: ReportWorkspaceProps) {
  const { currentUser, saveReport, favorites, toggleFavorite, logAction, addSchedule } =
  useApp();
  const { activeSource } = useErpConnection();
  const editable = canDesign(currentUser.role);

  const [panelOpen, setPanelOpen] = useState(defaultPanelOpen);
  const [panelTab, setPanelTab] = useState<ConfigTab>('Fields');
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());

  const visibleColumns = definition.columns.filter((c) => c.visible);

  /* Studio → API → query engine → ERP database → rows */
  const { meta: queryMeta, rerun, rows: remoteRows } = useErpQuery(definition, activeSource.name);

  const rows = useMemo(() => {
    let data = remoteRows ?? [];
    const calcs = definition.calculatedFields ?? [];
    if (calcs.length) {
      data = data.map((row) => {
        const next = { ...row };
        calcs.forEach((calc) => {
          const a = Number(row[calc.left] ?? 0);
          const b = Number(row[calc.right] ?? 0);
          next[calc.key] =
          calc.op === '*' ?
          a * b :
          calc.op === '+' ?
          a + b :
          calc.op === '-' ?
          a - b :
          b === 0 ?
          0 :
          a / b;
        });
        return next;
      });
    }
    if (definition.dateFrom && definition.dateTo) {
      data = data.filter((r) => {
        const d = String(r.date ?? '');
        return !d || d >= definition.dateFrom! && d <= definition.dateTo!;
      });
    }
    if (definition.basis === 'Cash') data = data.filter((r) => r.paid === 'Yes');
    data = applyFilters(data, definition.filters);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((row) =>
      visibleColumns.some((c) =>
      String(row[c.key] ?? '').
      toLowerCase().
      includes(q)
      )
      );
    }
    return applySort(data, definition.sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, search, remoteRows]);

  const aggOptions = { weighted: definition.weightedAverage, weightKey: 'amount' };
  const grandTotals = useMemo(
    () => aggregate(rows, visibleColumns, aggOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, definition.columns, definition.weightedAverage]
  );

  const allGroups = useMemo(
    () =>
    definition.groupBy ?
    groupRows(rows, definition.groupBy).map((g) => ({
      ...g,
      totals: aggregate(g.rows, visibleColumns, aggOptions)
    })) :
    null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, definition.groupBy, definition.columns, definition.weightedAverage]
  );

  const groupPages = useMemo(
    () => allGroups ? paginateGroups(allGroups, pageSize) : null,
    [allGroups, pageSize]
  );

  const pageCount = groupPages ?
  groupPages.length :
  Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageGroups = groupPages ? groupPages[safePage] : null;
  const pageRows = groupPages ? [] : rows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const shownCount = pageGroups ?
  pageGroups.reduce((sum, g) => sum + g.rows.length, 0) :
  pageRows.length;
  const firstIndex = pageGroups ?
  groupPages!.
  slice(0, safePage).
  reduce((sum, p) => sum + p.reduce((s, g) => s + g.rows.length, 0), 0) + 1 :
  safePage * pageSize + 1;

  const patch = (changes: Partial<ReportDefinition>) =>
  onDefinitionChange({ ...definition, ...changes });

  const columnChange = (id: string, columnPatch: Partial<ReportColumn>) =>
  patch({
    columns: definition.columns.map((c) => c.id === id ? { ...c, ...columnPatch } : c)
  });

  const removeColumn = (id: string) => {
    const col = definition.columns.find((c) => c.id === id);
    if (col?.locked) {
      toast.error('This column belongs to the fixed template and cannot be removed.');
      return;
    }
    patch({ columns: definition.columns.filter((c) => c.id !== id) });
  };

  const reorderColumn = (fromId: string, toId: string) => {
    const next = [...definition.columns];
    const from = next.findIndex((c) => c.id === fromId);
    const to = next.findIndex((c) => c.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    patch({ columns: next });
  };

  const addField = (field: ErpField) => {
    if (definition.columns.some((c) => c.id === field.id)) return;
    patch({ columns: [...definition.columns, columnFromField(field)] });
    logAction(`Added field "${field.displayName}"`, definition.name);
    toast.success(`${field.displayName} added to the report`);
  };

  const setSort = (key: string, dir: 'asc' | 'desc') => {
    const col = definition.columns.find((c) => c.key === key);
    patch({ sort: [{ key, label: col?.label ?? key, dir }] });
  };

  const exportPayload = {
    definition,
    columns: visibleColumns,
    groups: allGroups,
    rows,
    grandTotals
  };

  const handleExport = (format: 'Excel' | 'CSV' | 'PDF') => {
    if (format === 'CSV') exportCsv(exportPayload);else
    if (format === 'Excel') exportExcel(exportPayload);else
    exportPdf();
    logAction(`Exported report (${format})`, definition.name);
    toast.success(`${definition.name} exported to ${format}`);
  };

  const handleSave = () => {
    if (isTemplate) {
      setSaveAsOpen(true);
      return;
    }
    saveReport(definition);
    logAction('Saved report', definition.name);
    toast.success('Report saved');
  };

  const resetToDefault = () => {
    const template = getTemplate(definition.templateId ?? definition.id);
    if (!template) return;
    onDefinitionChange(cloneDefinition(template));
    setCollapsedGroups([]);
    toast.success('Report restored to the default template structure');
  };

  const allGroupKeys = allGroups?.map((g) => g.key) ?? [];
  const allCollapsed = allGroupKeys.length > 0 && collapsedGroups.length === allGroupKeys.length;

  const requestRefresh = () => {
    rerun();
    setRefreshedAt(new Date());
    logAction('Report executed — refreshed from ERP', definition.name, activeSource.name);
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <ReportToolbar
          definition={definition}
          onChange={patch}
          editing={panelOpen}
          onToggleEdit={() => setPanelOpen((o) => !o)}
          canEdit={editable}
          isTemplate={isTemplate || Boolean(definition.templateId)}
          isFavorite={favorites.includes(definition.id)}
          onRefresh={() => {
            requestRefresh();
            toast.success(`Requesting updated data from ${activeSource.name}`);
          }}
          onAddField={() => setAddFieldOpen(true)}
          onOpenPanel={(tab) => {
            setPanelTab(tab);
            setPanelOpen(true);
          }}
          onColumns={() => setColumnsOpen(true)}
          onSave={handleSave}
          onSaveAs={() => setSaveAsOpen(true)}
          onReset={resetToDefault}
          onExport={handleExport}
          onPrint={() => {
            window.print();
            logAction('Printed report', definition.name);
          }}
          onShare={() => toast.success(`Sharing link generated for ${definition.name}`)}
          onFavorite={() => toggleFavorite(definition.id)}
          onSchedule={() => setScheduleOpen(true)}
          filterCount={definition.filters.length} />
        

        <QueryStatusBar meta={queryMeta} onRefresh={requestRefresh} />

        <FilterChips
          filters={definition.filters}
          onRemove={(id) => patch({ filters: definition.filters.filter((f) => f.id !== id) })}
          onClear={() => patch({ filters: [] })} />
        

        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-1.5">
          <div className="relative w-64">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              className={`${inputClass} h-7 pl-7 text-xs`}
              placeholder="Search within report…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              aria-label="Search within report" />
            
          </div>
          {allGroups &&
          <Button
            size="sm"
            icon={
            allCollapsed ?
            <ChevronsUpDownIcon className="h-3.5 w-3.5" /> :

            <ChevronsDownUpIcon className="h-3.5 w-3.5" />

            }
            onClick={() => setCollapsedGroups(allCollapsed ? [] : allGroupKeys)}>
            
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </Button>
          }
          {selectedRows.length > 0 &&
          <span className="text-2xs text-accent-700">
              {selectedRows.length} row{selectedRows.length === 1 ? '' : 's'} selected
            </span>
          }
          <span className="ml-auto text-2xs text-ink-500">
            Requested{' '}
            {refreshedAt.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {!panelOpen &&
          <Button
            size="sm"
            icon={<SlidersHorizontalIcon className="h-3.5 w-3.5" />}
            onClick={() => setPanelOpen(true)}>
            
              Configure
            </Button>
          }
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-surface-muted">
          {queryMeta.state === 'running' &&
          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center">
              <p className="mt-2 flex items-center gap-1.5 rounded border border-accent-200 bg-white px-2.5 py-1 text-2xs font-medium text-accent-700 shadow-panel">
                <Loader2Icon className="h-3 w-3 animate-spin" />
                Previewing report — querying {activeSource.name}…
              </p>
            </div>
          }
          <div className="flex h-full flex-col bg-white">
            {visibleColumns.length === 0 && emptyState ?
            emptyState :

            <>
            <ReportHeading definition={definition} />
            <ReportTable
                definition={definition}
                columns={visibleColumns}
                groups={pageGroups}
                rows={pageRows}
                grandTotals={grandTotals}
                groupLabel={definition.name}
                collapsed={collapsedGroups}
                onToggleGroup={(key) =>
                setCollapsedGroups((prev) =>
                prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                )
                }
                onSort={setSort}
                onColumnChange={columnChange}
                onReorder={reorderColumn}
                selectedRows={selectedRows}
                onSelectRow={(id) =>
                setSelectedRows((prev) =>
                prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
                )
                } />
              
              </>
            }
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-line bg-white px-3 py-1.5">
          <p className="text-xs text-ink-700">
            Showing{' '}
            <span className="tabular font-medium">
              {rows.length === 0 ? 0 : firstIndex.toLocaleString()}–
              {(firstIndex + shownCount - 1).toLocaleString()}
            </span>{' '}
            of <span className="tabular font-medium">{rows.length.toLocaleString()}</span>{' '}
            records
          </p>
          <div className="flex items-center gap-1.5">
            <label className="text-2xs uppercase tracking-wide text-ink-500" htmlFor="page-size">
              Rows
            </label>
            <select
              id="page-size"
              className={`${selectClass} h-7 w-[76px] text-xs`}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}>
              
              {pageSizes.map((size) =>
              <option key={size} value={size}>
                  {size}
                </option>
              )}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              icon={<ChevronLeftIcon className="h-3.5 w-3.5" />}
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}>
              
              Prev
            </Button>
            <span className="px-2 text-xs text-ink-700">
              Page {safePage + 1} of {pageCount}
            </span>
            <Button
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>
              
              Next
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </footer>
      </div>

      {panelOpen &&
      <ConfigPanel
        definition={definition}
        onChange={patch}
        onColumnChange={columnChange}
        onRemoveColumn={removeColumn}
        onReorderColumn={reorderColumn}
        onAddField={() => setAddFieldOpen(true)}
        tab={panelTab}
        onTabChange={setPanelTab}
        onClose={() => setPanelOpen(false)} />

      }

      <AddFieldDialog
        open={addFieldOpen}
        onClose={() => setAddFieldOpen(false)}
        onAdd={addField}
        existingIds={definition.columns.map((c) => c.id)} />
      
      <ColumnManagerDialog
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        columns={definition.columns}
        onColumnChange={columnChange}
        onRemove={removeColumn}
        onReorder={reorderColumn}
        onAddField={() => setAddFieldOpen(true)} />
      
      <SaveAsDialog
        open={saveAsOpen}
        onClose={() => setSaveAsOpen(false)}
        definition={definition}
        owner={currentUser.name}
        onSave={(meta) => {
          const saved: ReportDefinition = {
            ...definition,
            ...meta,
            id: `report-${Date.now()}`,
            type: 'Custom Report',
            templateId: isTemplate ? definition.id : definition.templateId,
            owner: currentUser.name,
            createdBy: currentUser.name,
            lastModified: new Date().toISOString(),
            lastRun: new Date().toISOString()
          };
          saveReport(saved);
          logAction('Saved customized template', saved.name);
          toast.success(`“${saved.name}” saved to My Reports`);
        }} />
      
      <ScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        reportName={definition.name}
        onSchedule={(schedule) => {
          addSchedule(schedule);
          logAction(`Scheduled report (${schedule.frequency}, ${schedule.format})`, definition.name);
          toast.success('Schedule created');
        }} />
      
    </div>);

}