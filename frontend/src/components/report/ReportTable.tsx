import { Fragment, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeOffIcon,
  MoreVerticalIcon,
  PinIcon,
  PinOffIcon } from
'lucide-react';
import type { ReportColumn, ReportDefinition, Row, SortRule } from '../../types/erp';
import type { GroupBlock } from '../../utils/reportEngine';
import { formatCell, formatValue } from '../../utils/format';
import { InvoicePdfButton } from './InvoicePdfButton';
import { cx } from '../../utils/ui';

interface ReportTableProps {
  definition: ReportDefinition;
  columns: ReportColumn[];
  groups: GroupBlock[] | null;
  rows: Row[];
  grandTotals: Record<string, number | null>;
  groupLabel: string;
  collapsed: string[];
  onToggleGroup: (key: string) => void;
  onSort: (key: string, dir: 'asc' | 'desc') => void;
  onColumnChange: (id: string, patch: Partial<ReportColumn>) => void;
  onReorder: (fromId: string, toId: string) => void;
  selectedRows: string[];
  onSelectRow: (id: string) => void;
}

const density = {
  compact: { cell: 'px-2 py-[3px] text-xs', head: 'px-2 py-1.5 text-2xs' },
  normal: { cell: 'px-2.5 py-[5px] text-[13px]', head: 'px-2.5 py-2 text-2xs' },
  relaxed: { cell: 'px-3 py-2 text-[13px]', head: 'px-3 py-2.5 text-xs' }
};

function sortFor(sort: SortRule[], key: string) {
  return sort.find((s) => s.key === key);
}

export function ReportTable({
  definition,
  columns,
  groups,
  rows,
  grandTotals,
  groupLabel,
  collapsed,
  onToggleGroup,
  onSort,
  onColumnChange,
  onReorder,
  selectedRows,
  onSelectRow
}: ReportTableProps) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const resizing = useRef<{id: string;startX: number;startWidth: number;} | null>(null);
  const d = density[definition.fontSize];

  const pinned = columns.filter((c) => c.pinned);
  const offsets = new Map<string, number>();
  let acc = 34;
  pinned.forEach((c) => {
    offsets.set(c.id, acc);
    acc += c.width;
  });

  const startResize = (e: ReactMouseEvent, col: ReportColumn) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { id: col.id, startX: e.clientX, startWidth: col.width };
    const move = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const width = Math.max(60, resizing.current.startWidth + ev.clientX - resizing.current.startX);
      onColumnChange(resizing.current.id, { width });
    };
    const up = () => {
      resizing.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const totalCells = (totals: Record<string, number | null>, label: string, variant: 'group' | 'grand') =>
  <tr
    className={cx(
      'tabular font-semibold',
      variant === 'group' ?
      'bg-surface-muted text-ink-900' :
      'border-t-2 border-navy-900 bg-navy-900/[0.06] text-ink-900'
    )}>
    
      <td className={cx(d.cell, 'sticky left-0 z-10 bg-inherit')} />
      {columns.map((col, idx) => {
      const value = totals[col.key];
      const showLabel = idx === 0;
      return (
        <td
          key={col.id}
          style={
          col.pinned ?
          { left: offsets.get(col.id), position: 'sticky', zIndex: 10 } :
          undefined
          }
          className={cx(
            d.cell,
            'whitespace-nowrap border-t border-line bg-inherit',
            col.align === 'right' && 'text-right',
            col.align === 'center' && 'text-center'
          )}>
          
            {showLabel ?
          label :
          value === null || value === undefined ?
          '' :
          formatValue(value, col.format, col.decimals)}
          </td>);

    })}
    </tr>;


  const dataRow = (row: Row, index: number) => {
    const rowId = String(row.lineId ?? row.invoiceId ?? row.paymentId ?? index);
    const selected = selectedRows.includes(rowId);
    return (
      <tr
        key={rowId}
        onClick={() => onSelectRow(rowId)}
        className={cx(
          'cursor-default border-b border-line/70 transition-colors duration-100',
          selected ? 'bg-accent-50' : index % 2 === 1 ? 'bg-surface-muted/40' : 'bg-white',
          'hover:bg-accent-50/60'
        )}>
        
        <td className={cx(d.cell, 'sticky left-0 z-[5] w-[34px] bg-inherit text-center')}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelectRow(rowId)}
            aria-label={`Select row ${rowId}`}
            className="h-3 w-3 rounded border-line-strong accent-accent-500" />
          
        </td>
        {columns.map((col) =>
        <td
          key={col.id}
          style={
          col.pinned ?
          { left: offsets.get(col.id), position: 'sticky', zIndex: 5 } :
          undefined
          }
          className={cx(
            d.cell,
            'truncate whitespace-nowrap bg-inherit text-ink-700',
            col.align === 'right' && 'tabular text-right',
            col.align === 'center' && 'text-center',
            col.pinned && 'border-r border-line'
          )}
          title={formatCell(row, col)}>
          
            {col.key === 'num' && row.num && definition.dataset !== 'erpTable' ?
          <span className="flex items-center gap-1.5">
                <span className="min-w-0 truncate">{formatCell(row, col)}</span>
                <InvoicePdfButton invoiceNo={String(row.num)} />
              </span> :

          formatCell(row, col)}
          </td>
        )}
      </tr>);

  };

  return (
    <div className="relative min-h-0 flex-1 overflow-auto erp-scroll border-t border-line bg-white">
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 34 }} />
          {columns.map((c) =>
          <col key={c.id} style={{ width: c.width }} />
          )}
        </colgroup>
        <thead>
          <tr>
            <th
              className={cx(
                d.head,
                'sticky left-0 top-0 z-30 w-[34px] border-b border-line bg-surface-sunken'
              )} />
            
            {columns.map((col) => {
              const active = sortFor(definition.sort, col.key);
              return (
                <th
                  key={col.id}
                  scope="col"
                  draggable
                  onDragStart={() => {
                    dragId.current = col.id;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId.current && dragId.current !== col.id)
                    onReorder(dragId.current, col.id);
                    dragId.current = null;
                  }}
                  style={
                  col.pinned ?
                  { left: offsets.get(col.id), position: 'sticky', zIndex: 30 } :
                  undefined
                  }
                  className={cx(
                    d.head,
                    'group sticky top-0 z-20 select-none border-b border-r border-line bg-surface-sunken font-semibold uppercase tracking-wide text-ink-500',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    definition.headerStyle === 'plain' && 'normal-case tracking-normal'
                  )}>
                  
                  <div
                    className={cx(
                      'flex items-center gap-1',
                      col.align === 'right' && 'justify-end',
                      col.align === 'center' && 'justify-center'
                    )}>
                    
                    <button
                      type="button"
                      onClick={() =>
                      onSort(col.key, active?.dir === 'asc' ? 'desc' : 'asc')
                      }
                      className="min-w-0 truncate text-left transition-colors duration-150 hover:text-accent-600"
                      title={`Sort by ${col.label}`}>
                      
                      {col.label}
                    </button>
                    {active && (
                    active.dir === 'asc' ?
                    <ArrowUpIcon className="h-3 w-3 shrink-0 text-accent-600" /> :

                    <ArrowDownIcon className="h-3 w-3 shrink-0 text-accent-600" />)
                    }
                    {col.pinned && <PinIcon className="h-3 w-3 shrink-0 text-ink-400" />}
                    <button
                      type="button"
                      aria-label={`${col.label} column options`}
                      onClick={() => setMenuFor(menuFor === col.id ? null : col.id)}
                      className="ml-auto shrink-0 rounded p-0.5 text-ink-400 opacity-0 transition-opacity duration-150 hover:bg-white group-hover:opacity-100">
                      
                      <MoreVerticalIcon className="h-3 w-3" />
                    </button>
                  </div>
                  {menuFor === col.id &&
                  <div className="absolute right-0 top-full z-40 w-44 rounded border border-line bg-white py-1 text-left text-xs font-normal normal-case tracking-normal text-ink-700 shadow-pop">
                      <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2.5 py-1.5 hover:bg-surface-muted"
                      onClick={() => {
                        onSort(col.key, 'asc');
                        setMenuFor(null);
                      }}>
                      
                        <ArrowUpIcon className="h-3.5 w-3.5" /> Sort ascending
                      </button>
                      <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2.5 py-1.5 hover:bg-surface-muted"
                      onClick={() => {
                        onSort(col.key, 'desc');
                        setMenuFor(null);
                      }}>
                      
                        <ArrowDownIcon className="h-3.5 w-3.5" /> Sort descending
                      </button>
                      <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2.5 py-1.5 hover:bg-surface-muted"
                      onClick={() => {
                        onColumnChange(col.id, { pinned: !col.pinned });
                        setMenuFor(null);
                      }}>
                      
                        {col.pinned ?
                      <PinOffIcon className="h-3.5 w-3.5" /> :

                      <PinIcon className="h-3.5 w-3.5" />
                      }
                        {col.pinned ? 'Unfreeze column' : 'Freeze column'}
                      </button>
                      <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2.5 py-1.5 hover:bg-surface-muted"
                      onClick={() => {
                        onColumnChange(col.id, { visible: false });
                        setMenuFor(null);
                      }}>
                      
                        <EyeOffIcon className="h-3.5 w-3.5" /> Hide column
                      </button>
                    </div>
                  }
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    onMouseDown={(e) => startResize(e, col)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-accent-300" />
                  
                </th>);

            })}
          </tr>
        </thead>

        <tbody>
          {groups ?
          groups.map((group) => {
            const isCollapsed = collapsed.includes(group.key);
            return (
              <Fragment key={group.key}>
                    <tr className="bg-surface-sunken">
                      <td
                    colSpan={columns.length + 1}
                    className={cx(d.cell, 'border-y border-line')}>
                    
                        <button
                      type="button"
                      onClick={() => onToggleGroup(group.key)}
                      aria-expanded={!isCollapsed}
                      className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-900 transition-colors duration-150 hover:text-accent-600">
                      
                          {isCollapsed ?
                      <ChevronRightIcon className="h-3.5 w-3.5" /> :

                      <ChevronDownIcon className="h-3.5 w-3.5" />
                      }
                          {group.key}
                          <span className="ml-1 font-normal text-ink-500">
                            ({group.rows.length})
                          </span>
                        </button>
                      </td>
                    </tr>
                    {!isCollapsed && group.rows.map((row, i) => dataRow(row, i))}
                    {definition.showSubtotals &&
                totalCells(group.totals, `Total ${group.key}`, 'group')}
                  </Fragment>);

          }) :
          rows.map((row, i) => dataRow(row, i))}

          {definition.showGrandTotal && (
          groups ? groups.length > 0 : rows.length > 0) &&
          totalCells(grandTotals, 'TOTAL', 'grand')}
        </tbody>
      </table>

      {(groups ? groups.length === 0 : rows.length === 0) &&
      <p className="px-4 py-10 text-center text-xs text-ink-500">
          No records match the current filters for this {groupLabel.toLowerCase()} report.
        </p>
      }
    </div>);

}