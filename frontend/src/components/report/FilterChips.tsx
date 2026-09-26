import { FilterIcon, XIcon } from 'lucide-react';
import type { FilterRule } from '../../types/erp';
import { formatDate } from '../../utils/format';

function describe(rule: FilterRule): string {
  const value =
  rule.dataType === 'date' ? formatDate(rule.value) : rule.value;
  const value2 =
  rule.dataType === 'date' ? formatDate(rule.value2 ?? '') : rule.value2;
  if (rule.operator === 'is between') return `${rule.label} is between ${value} and ${value2}`;
  if (rule.operator === 'is empty') return `${rule.label} is empty`;
  return `${rule.label} ${rule.operator} ${value}`;
}

export function FilterChips({
  filters,
  onRemove,
  onClear




}: {filters: FilterRule[];onRemove: (id: string) => void;onClear: () => void;}) {
  if (!filters.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-accent-50/60 px-3 py-1.5">
      <FilterIcon className="h-3.5 w-3.5 text-accent-600" />
      <span className="mr-1 text-2xs font-semibold uppercase tracking-wide text-accent-700">
        Active filters
      </span>
      {filters.map((rule, i) =>
      <span
        key={rule.id}
        className="inline-flex items-center gap-1 rounded border border-accent-200 bg-white px-1.5 py-0.5 text-2xs text-ink-700">
        
          {i > 0 && <span className="font-semibold text-accent-600">{rule.connector}</span>}
          {describe(rule)}
          <button
          type="button"
          aria-label={`Remove filter ${rule.label}`}
          onClick={() => onRemove(rule.id)}
          className="rounded text-ink-400 transition-colors duration-150 hover:text-red-600">
          
            <XIcon className="h-3 w-3" />
          </button>
        </span>
      )}
      <button
        type="button"
        onClick={onClear}
        className="ml-1 text-2xs font-medium text-accent-700 underline-offset-2 hover:underline">
        
        Clear all
      </button>
    </div>);

}