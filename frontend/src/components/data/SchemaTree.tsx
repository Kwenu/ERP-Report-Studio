import { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, KeyIcon, LinkIcon, SearchIcon, TableIcon } from 'lucide-react';
import { erpTables } from '../../data/schema';
import type { ErpField } from '../../types/erp';
import { inputClass, cx } from '../../utils/ui';

interface SchemaTreeProps {
  activeTable: string;
  onSelectTable: (table: string) => void;
  onSelectField: (field: ErpField) => void;
  selectedFieldId?: string;
}

export function SchemaTree({
  activeTable,
  onSelectTable,
  onSelectField,
  selectedFieldId
}: SchemaTreeProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>([activeTable]);

  const tables = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return erpTables;
    return erpTables.
    map((t) => ({
      ...t,
      fields: t.fields.filter(
        (f) =>
        f.name.toLowerCase().includes(q) || f.displayName.toLowerCase().includes(q)
      )
    })).
    filter((t) => t.fields.length > 0 || t.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            className={`${inputClass} h-7 pl-7 text-xs`}
            placeholder="Search tables and fields…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search discovered schema" />
          
        </div>
      </div>

      <div className="max-h-[520px] min-h-0 flex-1 overflow-y-auto erp-scroll">
        {tables.map((table) => {
          const isOpen = expanded.includes(table.name) || query.trim().length > 0;
          return (
            <div key={table.name}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  onSelectTable(table.name);
                  setExpanded((prev) =>
                  prev.includes(table.name) ?
                  prev.filter((t) => t !== table.name) :
                  [...prev, table.name]
                  );
                }}
                className={cx(
                  'flex w-full items-center gap-1.5 border-b border-line px-2 py-1.5 text-left text-xs font-medium transition-colors duration-150',
                  table.name === activeTable ?
                  'bg-accent-50 text-accent-800' :
                  'text-ink-900 hover:bg-surface-muted'
                )}>
                
                {isOpen ?
                <ChevronDownIcon className="h-3.5 w-3.5 text-ink-400" /> :

                <ChevronRightIcon className="h-3.5 w-3.5 text-ink-400" />
                }
                <TableIcon className="h-3.5 w-3.5 text-ink-400" />
                <span className="truncate">{table.name}</span>
                <span className="ml-auto text-2xs font-normal text-ink-400">
                  {table.fields.length}
                </span>
              </button>
              {isOpen &&
              <ul className="border-b border-line bg-surface-muted/40 py-0.5">
                  {table.fields.map((field) =>
                <li key={field.id}>
                      <button
                    type="button"
                    onClick={() => onSelectField(field)}
                    className={cx(
                      'flex w-full items-center gap-1.5 py-[3px] pl-7 pr-2 text-left text-xs transition-colors duration-150 hover:bg-accent-50',
                      selectedFieldId === field.id ?
                      'text-accent-700' :
                      'text-ink-700'
                    )}>
                    
                        {field.isKey ?
                    <KeyIcon className="h-3 w-3 shrink-0 text-amber-500" aria-label="Primary key" /> :
                    field.references ?
                    <LinkIcon className="h-3 w-3 shrink-0 text-accent-500" aria-label="Foreign key" /> :

                    <span className="h-3 w-3 shrink-0" />
                    }
                        <span className="truncate">{field.name}</span>
                        <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wide text-ink-400">
                          {field.dataType}
                        </span>
                      </button>
                    </li>
                )}
                </ul>
              }
            </div>);

        })}
      </div>

      <p className="flex items-center gap-3 border-t border-line bg-surface-muted px-2 py-1.5 text-2xs text-ink-500">
        <span className="flex items-center gap-1">
          <KeyIcon className="h-3 w-3 text-amber-500" /> Primary key
        </span>
        <span className="flex items-center gap-1">
          <LinkIcon className="h-3 w-3 text-accent-500" /> Foreign key
        </span>
      </p>
    </div>);

}