import { PanelRightCloseIcon, PlusIcon, XIcon } from 'lucide-react';
import type { Aggregation, ReportColumn, ReportDefinition } from '../../types/erp';
import { FieldsTab } from './FieldsTab';
import { FilterBuilder } from './FilterBuilder';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { groupOptions } from '../../data/templates';
import { cx, selectClass } from '../../utils/ui';

export type ConfigTab =
'Fields' |
'Formatting' |
'Grouping' |
'Sorting' |
'Filters' |
'Totals';

const tabs: ConfigTab[] = [
'Fields',
'Formatting',
'Grouping',
'Sorting',
'Filters',
'Totals'];


interface ConfigPanelProps {
  definition: ReportDefinition;
  onChange: (patch: Partial<ReportDefinition>) => void;
  onColumnChange: (id: string, patch: Partial<ReportColumn>) => void;
  onRemoveColumn: (id: string) => void;
  onReorderColumn: (fromId: string, toId: string) => void;
  onAddField: () => void;
  tab: ConfigTab;
  onTabChange: (tab: ConfigTab) => void;
  onClose: () => void;
}

const aggLabels: Record<Aggregation, string> = {
  none: 'None',
  sum: 'Sum',
  avg: 'Average',
  count: 'Count',
  min: 'Minimum',
  max: 'Maximum'
};

export function ConfigPanel({
  definition,
  onChange,
  onColumnChange,
  onRemoveColumn,
  onReorderColumn,
  onAddField,
  tab,
  onTabChange,
  onClose
}: ConfigPanelProps) {
  const numericColumns = definition.columns.filter(
    (c) => c.dataType === 'currency' || c.dataType === 'decimal' || c.dataType === 'integer'
  );

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-line bg-white">
      <header className="flex h-10 items-center justify-between border-b border-line bg-surface-muted px-3">
        <h2 className="text-[13px] font-semibold text-ink-900">Report configuration</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close configuration panel"
          className="rounded p-1 text-ink-500 transition-colors duration-150 hover:bg-surface-sunken hover:text-ink-900">
          
          <PanelRightCloseIcon className="h-4 w-4" />
        </button>
      </header>

      <nav className="flex flex-wrap border-b border-line bg-white" aria-label="Configuration tabs">
        {tabs.map((t) =>
        <button
          key={t}
          type="button"
          onClick={() => onTabChange(t)}
          className={cx(
            'border-b-2 px-2.5 py-1.5 text-xs font-medium transition-colors duration-150',
            tab === t ?
            'border-accent-500 text-accent-700' :
            'border-transparent text-ink-500 hover:text-ink-900'
          )}>
          
            {t}
          </button>
        )}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto erp-scroll">
        {tab === 'Fields' &&
        <FieldsTab
          columns={definition.columns}
          onColumnChange={onColumnChange}
          onRemove={onRemoveColumn}
          onReorder={onReorderColumn}
          onAddField={onAddField} />

        }

        {tab === 'Formatting' &&
        <div className="space-y-3 p-3">
            <Field label="Header style">
              <select
              className={selectClass}
              value={definition.headerStyle}
              onChange={(e) =>
              onChange({ headerStyle: e.target.value as 'bold' | 'plain' })
              }>
              
                <option value="bold">Bold uppercase</option>
                <option value="plain">Plain sentence case</option>
              </select>
            </Field>
            <Field label="Row density / font size">
              <select
              className={selectClass}
              value={definition.fontSize}
              onChange={(e) =>
              onChange({
                fontSize: e.target.value as ReportDefinition['fontSize']
              })
              }>
              
                <option value="compact">Compact (11px)</option>
                <option value="normal">Normal (13px)</option>
                <option value="relaxed">Relaxed (13px, taller rows)</option>
              </select>
            </Field>
            <div className="rounded border border-line bg-surface-muted p-2.5">
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                Column formatting
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-700">
                Number, currency, percentage, date formats, decimal places and alignment
                are configured per column.
              </p>
              <Button
              size="sm"
              className="mt-2"
              onClick={() => onTabChange('Fields')}>
              
                Open column settings
              </Button>
            </div>
            <ul className="divide-y divide-line rounded border border-line">
              {definition.columns.slice(0, 8).map((c) =>
            <li
              key={c.id}
              className="flex items-center justify-between px-2 py-1.5 text-xs">
              
                  <span className="truncate text-ink-700">{c.label}</span>
                  <span className="shrink-0 text-2xs uppercase tracking-wide text-ink-500">
                    {c.format}
                    {c.format === 'currency' || c.format === 'number' ?
                ` · ${c.decimals}dp` :
                ''}
                  </span>
                </li>
            )}
            </ul>
          </div>
        }

        {tab === 'Grouping' &&
        <div className="space-y-3 p-3">
            <fieldset>
              <legend className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                Group records by
              </legend>
              <div className="divide-y divide-line rounded border border-line">
                <label className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-ink-700 hover:bg-surface-muted">
                  <input
                  type="radio"
                  name="groupBy"
                  className="accent-accent-500"
                  checked={definition.groupBy === null}
                  onChange={() => onChange({ groupBy: null })} />
                
                  No grouping (flat list)
                </label>
                {groupOptions.map((option) =>
              <label
                key={option.key}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-ink-700 hover:bg-surface-muted">
                
                    <input
                  type="radio"
                  name="groupBy"
                  className="accent-accent-500"
                  checked={definition.groupBy === option.key}
                  onChange={() => onChange({ groupBy: option.key })} />
                
                    Group by {option.label}
                  </label>
              )}
              </div>
            </fieldset>
            <label className="flex items-center gap-2 text-xs text-ink-700">
              <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-accent-500"
              checked={definition.showSubtotals}
              onChange={(e) => onChange({ showSubtotals: e.target.checked })} />
            
              Show a subtotal row for each group
            </label>
          </div>
        }

        {tab === 'Sorting' &&
        <div className="space-y-2 p-3">
            {definition.sort.length === 0 &&
          <p className="rounded border border-dashed border-line bg-surface-muted px-3 py-4 text-center text-xs text-ink-500">
                No sort applied. Records follow the ERP source order.
              </p>
          }
            {definition.sort.map((rule, index) =>
          <div
            key={`${rule.key}-${index}`}
            className="flex items-center gap-1.5 rounded border border-line bg-white p-1.5">
            
                <select
              aria-label="Sort field"
              className={`${selectClass} flex-1`}
              value={rule.key}
              onChange={(e) => {
                const col = definition.columns.find((c) => c.key === e.target.value);
                if (!col) return;
                onChange({
                  sort: definition.sort.map((s, i) =>
                  i === index ? { ...s, key: col.key, label: col.label } : s
                  )
                });
              }}>
              
                  {definition.columns.map((c) =>
              <option key={c.id} value={c.key}>
                      {c.label}
                    </option>
              )}
                </select>
                <select
              aria-label="Sort direction"
              className={`${selectClass} w-[110px]`}
              value={rule.dir}
              onChange={(e) =>
              onChange({
                sort: definition.sort.map((s, i) =>
                i === index ?
                { ...s, dir: e.target.value as 'asc' | 'desc' } :
                s
                )
              })
              }>
              
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
                <button
              type="button"
              aria-label="Remove sort"
              onClick={() =>
              onChange({ sort: definition.sort.filter((_, i) => i !== index) })
              }
              className="rounded p-1 text-ink-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600">
              
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
          )}
            <Button
            size="sm"
            className="w-full"
            icon={<PlusIcon className="h-3.5 w-3.5" />}
            onClick={() => {
              const col = definition.columns[0];
              if (!col) return;
              onChange({
                sort: [
                ...definition.sort,
                { key: col.key, label: col.label, dir: 'asc' }]

              });
            }}>
            
              Add sort level
            </Button>
          </div>
        }

        {tab === 'Filters' &&
        <FilterBuilder
          filters={definition.filters}
          columns={definition.columns}
          onChange={(filters) => onChange({ filters })} />

        }

        {tab === 'Totals' &&
        <div className="space-y-3 p-3">
            <label className="flex items-center gap-2 text-xs text-ink-700">
              <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-accent-500"
              checked={definition.showSubtotals}
              onChange={(e) => onChange({ showSubtotals: e.target.checked })} />
            
              Group subtotals
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-700">
              <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-accent-500"
              checked={definition.showGrandTotal}
              onChange={(e) => onChange({ showGrandTotal: e.target.checked })} />
            
              Grand total row
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-700">
              <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-accent-500"
              checked={definition.weightedAverage}
              onChange={(e) => onChange({ weightedAverage: e.target.checked })} />
            
              Weight averages by transaction amount
            </label>

            <div>
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                Aggregation per numeric column
              </p>
              <div className="divide-y divide-line rounded border border-line">
                {numericColumns.map((col) =>
              <div
                key={col.id}
                className="flex items-center gap-2 px-2 py-1.5 text-xs">
                
                    <span className="min-w-0 flex-1 truncate text-ink-700">
                      {col.label}
                    </span>
                    <select
                  aria-label={`${col.label} aggregation`}
                  className="h-7 w-[110px] rounded border border-line bg-white px-1 text-xs"
                  value={col.aggregation}
                  onChange={(e) =>
                  onColumnChange(col.id, {
                    aggregation: e.target.value as Aggregation
                  })
                  }>
                  
                      {(Object.keys(aggLabels) as Aggregation[]).map((a) =>
                  <option key={a} value={a}>
                          {aggLabels[a]}
                        </option>
                  )}
                    </select>
                  </div>
              )}
                {numericColumns.length === 0 &&
              <p className="px-2 py-3 text-center text-xs text-ink-500">
                    Add a numeric field to configure totals.
                  </p>
              }
              </div>
            </div>
          </div>
        }
      </div>
    </aside>);

}