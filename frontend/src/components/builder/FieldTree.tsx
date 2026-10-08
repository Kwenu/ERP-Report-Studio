import { useMemo, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DatabaseIcon,
  GripVerticalIcon,
  KeyIcon,
  LinkIcon,
  SearchIcon,
  TableIcon } from
'lucide-react';
import { useErpConnection } from '../../contexts/ErpConnectionContext';
import type { ErpField } from '../../types/erp';
import { inputClass, cx } from '../../utils/ui';

const typeBadge: Record<string, string> = {
  text: 'Abc',
  integer: '123',
  decimal: '1.2',
  currency: '¤',
  date: 'Cal',
  datetime: 'Cal',
  boolean: 'Y/N'
};

interface FieldTreeProps {
  onFieldActivate: (field: ErpField) => void;
  usedFieldIds: string[];
}

export function FieldTree({ onFieldActivate, usedFieldIds }: FieldTreeProps) {
  const { activeSource, schemaStats, schemaTables, schemaLoading, schemaError, reloadSchema } = useErpConnection();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>(['Invoices', 'InvoiceLines']);

  const MAX_RESULTS = 60;
  const allMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schemaTables;
    return schemaTables.
    map((t) => ({
      ...t,
      fields: t.fields.filter(
        (f) =>
        f.name.toLowerCase().includes(q) || f.displayName.toLowerCase().includes(q)
      )
    })).
    filter((t) => t.fields.length > 0 || t.name.toLowerCase().includes(q));
  }, [query, schemaTables]);
  const tables = query.trim() ? allMatches.slice(0, MAX_RESULTS) : allMatches;

  return (
    <aside className="flex w-[268px] shrink-0 flex-col border-r border-line bg-white">
      <header className="border-b border-line bg-surface-muted px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-900">
          <DatabaseIcon className="h-4 w-4 text-accent-600" /> {activeSource.name}
        </h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-2xs text-ink-500">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
            aria-hidden />
          
          {activeSource.status} · {schemaStats.tables} tables · {schemaStats.fields} fields{schemaLoading ? ' · updating…' : ''}
        </p>
      </header>

      <div className="border-b border-line p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            className={`${inputClass} h-7 pl-7 text-xs`}
            placeholder="Search tables and fields…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search ERP fields" />
          
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto erp-scroll">
        {schemaError &&
        <div className="space-y-2 p-3 text-xs text-red-700">
            <p>{schemaError}</p>
            <button type="button" onClick={() => void reloadSchema(true)} className="rounded border border-line bg-white px-3 py-1 text-ink-700 hover:bg-surface-muted">
              Try again
            </button>
          </div>
        }
        {!schemaError && schemaLoading && schemaTables.length === 0 &&
        <p className="p-3 text-center text-xs text-ink-500">Reading tables from the ERP…</p>
        }
        {!schemaError && !schemaLoading && schemaTables.length === 0 &&
        <p className="p-3 text-center text-xs text-ink-500">No tables found. Connect a data source first.</p>
        }
        {tables.map((table) => {
          const isOpen = expanded.includes(table.name) || query.trim().length > 0;
          return (
            <div key={table.name}>
              <button
                type="button"
                onClick={() =>
                setExpanded((prev) =>
                prev.includes(table.name) ?
                prev.filter((t) => t !== table.name) :
                [...prev, table.name]
                )
                }
                aria-expanded={isOpen}
                className="flex w-full items-center gap-1.5 border-b border-line px-2 py-1.5 text-left text-xs font-medium text-ink-900 transition-colors duration-150 hover:bg-surface-muted">
                
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
                  {table.fields.map((field) => {
                  const used = usedFieldIds.includes(field.id);
                  return (
                    <li key={field.id}>
                        <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', field.id);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onDoubleClick={() => onFieldActivate(field)}
                        title={[field.description, field.example && `e.g. ${field.example}`].filter(Boolean).join(' · ') || field.id}
                        className={cx(
                          'group flex cursor-grab items-center gap-1.5 py-[3px] pl-7 pr-2 text-xs transition-colors duration-150 active:cursor-grabbing',
                          used ? 'text-accent-700' : 'text-ink-700',
                          'hover:bg-accent-50'
                        )}>
                        
                          <GripVerticalIcon className="h-3 w-3 shrink-0 text-ink-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                          <span className="w-7 shrink-0 rounded bg-white px-1 text-center text-[9px] font-medium uppercase text-ink-500">
                            {typeBadge[field.dataType]}
                          </span>
                          {field.isKey &&
                        <KeyIcon className="h-3 w-3 shrink-0 text-amber-500" aria-label="Primary key" />
                        }
                          {field.references &&
                        <LinkIcon
                          className="h-3 w-3 shrink-0 text-accent-500"
                          aria-label={`Foreign key to ${field.references}`} />

                        }
                          <span className="truncate">{field.name}</span>
                          <button
                          type="button"
                          onClick={() => onFieldActivate(field)}
                          className="ml-auto shrink-0 rounded px-1 text-2xs text-accent-700 opacity-0 transition-opacity duration-150 hover:underline group-hover:opacity-100">
                          
                            Add
                          </button>
                        </div>
                      </li>);

                })}
                </ul>
              }
            </div>);

        })}
        {query.trim() && allMatches.length > MAX_RESULTS &&
        <p className="px-3 py-2 text-2xs text-ink-500">
            Showing the first {MAX_RESULTS} of {allMatches.length} matching tables — type more to narrow down.
          </p>
        }
      </div>

      <footer className="border-t border-line bg-surface-muted px-3 py-2 text-2xs leading-relaxed text-ink-500">
        Drag a field onto Rows, Columns or Values, or double-click to add it to Rows.
      </footer>
    </aside>);

}