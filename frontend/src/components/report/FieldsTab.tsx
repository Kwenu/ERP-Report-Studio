import { useRef, useState } from 'react';
import {
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  LockIcon,
  PlusIcon,
  Settings2Icon,
  Trash2Icon } from
'lucide-react';
import type { Aggregation, ColumnFormat, ReportColumn } from '../../types/erp';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { inputClass, selectClass, cx } from '../../utils/ui';

interface FieldsTabProps {
  columns: ReportColumn[];
  onColumnChange: (id: string, patch: Partial<ReportColumn>) => void;
  onRemove: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onAddField: () => void;
}

const formats: ColumnFormat[] = ['text', 'number', 'currency', 'percent', 'date', 'boolean'];
const aggregations: Aggregation[] = ['none', 'sum', 'avg', 'count', 'min', 'max'];
const aggLabels: Record<Aggregation, string> = {
  none: 'None',
  sum: 'Sum',
  avg: 'Average',
  count: 'Count',
  min: 'Minimum',
  max: 'Maximum'
};

export function FieldsTab({
  columns,
  onColumnChange,
  onRemove,
  onReorder,
  onAddField
}: FieldsTabProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
          {columns.length} columns
        </p>
        <Button size="sm" icon={<PlusIcon className="h-3.5 w-3.5" />} onClick={onAddField}>
          Add field
        </Button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto erp-scroll">
        {columns.map((col) =>
        <li
          key={col.id}
          draggable
          onDragStart={() => {
            dragId.current = col.id;
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOverId(col.id);
          }}
          onDragLeave={() => setOverId((v) => v === col.id ? null : v)}
          onDrop={() => {
            if (dragId.current && dragId.current !== col.id)
            onReorder(dragId.current, col.id);
            dragId.current = null;
            setOverId(null);
          }}
          className={cx(
            'border-b border-line bg-white',
            overId === col.id && 'border-t-2 border-t-accent-500'
          )}>
          
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <GripVerticalIcon className="h-3.5 w-3.5 shrink-0 cursor-grab text-ink-400" />
              <button
              type="button"
              aria-label={col.visible ? `Hide ${col.label}` : `Show ${col.label}`}
              onClick={() => onColumnChange(col.id, { visible: !col.visible })}
              className="shrink-0 rounded p-0.5 text-ink-500 transition-colors duration-150 hover:bg-surface-muted hover:text-ink-900">
              
                {col.visible ?
              <EyeIcon className="h-3.5 w-3.5" /> :

              <EyeOffIcon className="h-3.5 w-3.5 text-ink-400" />
              }
              </button>
              <span
              className={cx(
                'min-w-0 flex-1 truncate text-xs',
                col.visible ? 'text-ink-900' : 'text-ink-400 line-through'
              )}
              title={col.id}>
              
                {col.label}
              </span>
              {col.locked &&
            <LockIcon className="h-3 w-3 shrink-0 text-ink-400" aria-label="Template field" />
            }
              <button
              type="button"
              aria-label={`Configure ${col.label}`}
              onClick={() => setExpanded(expanded === col.id ? null : col.id)}
              className="shrink-0 rounded p-0.5 text-ink-500 transition-colors duration-150 hover:bg-surface-muted hover:text-ink-900">
              
                <Settings2Icon className="h-3.5 w-3.5" />
              </button>
              <button
              type="button"
              aria-label={`Remove ${col.label}`}
              disabled={col.locked}
              onClick={() => onRemove(col.id)}
              className="shrink-0 rounded p-0.5 text-ink-400 transition-colors duration-150 enabled:hover:bg-red-50 enabled:hover:text-red-600 disabled:opacity-30">
              
                <Trash2Icon className="h-3.5 w-3.5" />
              </button>
            </div>

            {expanded === col.id &&
          <div className="grid grid-cols-2 gap-2 border-t border-line bg-surface-muted px-3 py-2.5">
                <Field label="Display name" className="col-span-2">
                  <input
                className={inputClass}
                value={col.label}
                onChange={(e) => onColumnChange(col.id, { label: e.target.value })} />
              
                </Field>
                <Field label="Source field" className="col-span-2">
                  <p className="rounded border border-line bg-white px-2 py-1.5 font-mono text-2xs text-ink-700">
                    {col.id}
                  </p>
                </Field>
                <Field label="Format">
                  <select
                className={selectClass}
                value={col.format}
                onChange={(e) =>
                onColumnChange(col.id, { format: e.target.value as ColumnFormat })
                }>
                
                    {formats.map((f) =>
                <option key={f} value={f}>
                        {f[0].toUpperCase() + f.slice(1)}
                      </option>
                )}
                  </select>
                </Field>
                <Field label="Decimal places">
                  <select
                className={selectClass}
                value={col.decimals}
                onChange={(e) =>
                onColumnChange(col.id, { decimals: Number(e.target.value) })
                }>
                
                    {[0, 1, 2, 3, 4].map((n) =>
                <option key={n} value={n}>
                        {n}
                      </option>
                )}
                  </select>
                </Field>
                <Field label="Aggregation">
                  <select
                className={selectClass}
                value={col.aggregation}
                onChange={(e) =>
                onColumnChange(col.id, {
                  aggregation: e.target.value as Aggregation
                })
                }>
                
                    {aggregations.map((a) =>
                <option key={a} value={a}>
                        {aggLabels[a]}
                      </option>
                )}
                  </select>
                </Field>
                <Field label="Alignment">
                  <select
                className={selectClass}
                value={col.align}
                onChange={(e) =>
                onColumnChange(col.id, {
                  align: e.target.value as ReportColumn['align']
                })
                }>
                
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </Field>
                <Field label="Column width (px)" className="col-span-2">
                  <input
                type="range"
                min={60}
                max={320}
                step={10}
                value={col.width}
                onChange={(e) => onColumnChange(col.id, { width: Number(e.target.value) })}
                className="w-full accent-accent-500" />
              
                </Field>
                <label className="col-span-2 flex items-center gap-2 text-xs text-ink-700">
                  <input
                type="checkbox"
                checked={col.pinned}
                onChange={(e) => onColumnChange(col.id, { pinned: e.target.checked })}
                className="h-3.5 w-3.5 accent-accent-500" />
              
                  Freeze / pin this column
                </label>
              </div>
          }
          </li>
        )}
        {columns.length === 0 &&
        <li className="px-3 py-6 text-center text-xs text-ink-500">
            No columns yet — add fields from the ERP catalogue.
          </li>
        }
      </ul>
    </div>);

}