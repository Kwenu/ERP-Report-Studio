import { PlusIcon, XIcon } from 'lucide-react';
import type { DataType, FilterOperator, FilterRule, ReportColumn } from '../../types/erp';
import { Button } from '../ui/Button';
import { inputClass, selectClass } from '../../utils/ui';

const operatorsByType: Record<string, FilterOperator[]> = {
  text: ['equals', 'not equals', 'contains', 'is empty'],
  date: ['is between', 'on or after', 'on or before', 'equals'],
  number: ['greater than', 'less than', 'is between', 'equals']
};

function bucket(dataType: DataType): keyof typeof operatorsByType {
  if (dataType === 'date' || dataType === 'datetime') return 'date';
  if (dataType === 'currency' || dataType === 'decimal' || dataType === 'integer')
  return 'number';
  return 'text';
}

interface FilterBuilderProps {
  filters: FilterRule[];
  columns: ReportColumn[];
  onChange: (filters: FilterRule[]) => void;
}

export function FilterBuilder({ filters, columns, onChange }: FilterBuilderProps) {
  const addRule = () => {
    const first = columns[0];
    if (!first) return;
    onChange([
    ...filters,
    {
      id: `f-${Date.now()}`,
      key: first.key,
      label: first.label,
      dataType: first.dataType,
      operator: operatorsByType[bucket(first.dataType)][0],
      value: '',
      value2: '',
      connector: 'AND'
    }]
    );
  };

  const update = (id: string, patch: Partial<FilterRule>) =>
  onChange(filters.map((f) => f.id === id ? { ...f, ...patch } : f));

  const remove = (id: string) => onChange(filters.filter((f) => f.id !== id));

  return (
    <div className="space-y-2 p-3">
      {filters.length === 0 &&
      <p className="rounded border border-dashed border-line bg-surface-muted px-3 py-4 text-center text-xs text-ink-500">
          No filters applied. Add a condition to narrow the report.
        </p>
      }

      {filters.map((rule, index) => {
        const kind = bucket(rule.dataType);
        const inputType = kind === 'date' ? 'date' : kind === 'number' ? 'number' : 'text';
        return (
          <div
            key={rule.id}
            className="rounded border border-line bg-white p-2 shadow-panel">
            
            <div className="mb-1.5 flex items-center gap-2">
              {index === 0 ?
              <span className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
                  Where
                </span> :

              <select
                aria-label="Join condition"
                className="h-6 rounded border border-line bg-surface-muted px-1 text-2xs font-semibold text-accent-700"
                value={rule.connector}
                onChange={(e) =>
                update(rule.id, { connector: e.target.value as 'AND' | 'OR' })
                }>
                
                  <option>AND</option>
                  <option>OR</option>
                </select>
              }
              <button
                type="button"
                onClick={() => remove(rule.id)}
                aria-label="Remove condition"
                className="ml-auto rounded p-0.5 text-ink-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600">
                
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <select
                aria-label="Filter field"
                className={`${selectClass} col-span-2`}
                value={rule.key}
                onChange={(e) => {
                  const col = columns.find((c) => c.key === e.target.value);
                  if (!col) return;
                  update(rule.id, {
                    key: col.key,
                    label: col.label,
                    dataType: col.dataType,
                    operator: operatorsByType[bucket(col.dataType)][0],
                    value: '',
                    value2: ''
                  });
                }}>
                
                {columns.map((c) =>
                <option key={c.id} value={c.key}>
                    {c.label}
                  </option>
                )}
              </select>

              <select
                aria-label="Operator"
                className={`${selectClass} col-span-2`}
                value={rule.operator}
                onChange={(e) =>
                update(rule.id, { operator: e.target.value as FilterOperator })
                }>
                
                {operatorsByType[kind].map((op) =>
                <option key={op} value={op}>
                    {op}
                  </option>
                )}
              </select>

              {rule.operator !== 'is empty' &&
              <input
                type={inputType}
                aria-label="Value"
                className={rule.operator === 'is between' ? inputClass : `${inputClass} col-span-2`}
                placeholder="Value"
                value={rule.value}
                onChange={(e) => update(rule.id, { value: e.target.value })} />

              }
              {rule.operator === 'is between' &&
              <input
                type={inputType}
                aria-label="Second value"
                className={inputClass}
                placeholder="and"
                value={rule.value2 ?? ''}
                onChange={(e) => update(rule.id, { value2: e.target.value })} />

              }
            </div>
          </div>);

      })}

      <Button
        size="sm"
        icon={<PlusIcon className="h-3.5 w-3.5" />}
        onClick={addRule}
        className="w-full">
        
        Add condition
      </Button>
    </div>);

}