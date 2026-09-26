import { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, LinkIcon, SearchIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { erpTables, relationshipsFor } from '../../data/schema';
import type { ErpField } from '../../types/erp';
import { inputClass, cx } from '../../utils/ui';

interface AddFieldDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (field: ErpField) => void;
  existingIds: string[];
}

export function AddFieldDialog({ open, onClose, onAdd, existingIds }: AddFieldDialogProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>(['Invoices']);
  const [selected, setSelected] = useState<ErpField | null>(null);

  const visibleTables = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return erpTables;
    return erpTables.
    map((t) => ({
      ...t,
      fields: t.fields.filter(
        (f) =>
        f.name.toLowerCase().includes(q) ||
        f.displayName.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
      )
    })).
    filter((t) => t.fields.length > 0);
  }, [query]);

  const related = selected ? relationshipsFor(selected.table) : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add ERP field"
      description="Browse the catalogue and add a field as a new report column."
      width="max-w-3xl"
      footer={
      <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
          variant="primary"
          disabled={!selected || existingIds.includes(selected.id)}
          onClick={() => {
            if (selected) onAdd(selected);
            setSelected(null);
            onClose();
          }}>
          
            Add field
          </Button>
        </>
      }>
      
      <div className="grid grid-cols-[1fr_260px] gap-3">
        <div>
          <div className="relative mb-2">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              className={`${inputClass} pl-8`}
              placeholder="Search tables and fields…"
              value={query}
              onChange={(e) => setQuery(e.target.value)} />
            
          </div>
          <div className="max-h-[46vh] overflow-y-auto erp-scroll rounded border border-line">
            {visibleTables.map((table) => {
              const isOpen = expanded.includes(table.name) || query.trim().length > 0;
              return (
                <div key={table.name} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() =>
                    setExpanded((prev) =>
                    prev.includes(table.name) ?
                    prev.filter((t) => t !== table.name) :
                    [...prev, table.name]
                    )
                    }
                    className="flex w-full items-center gap-1.5 bg-surface-muted px-2 py-1.5 text-left text-xs font-semibold text-ink-900 transition-colors duration-150 hover:bg-surface-sunken">
                    
                    {isOpen ?
                    <ChevronDownIcon className="h-3.5 w-3.5" /> :

                    <ChevronRightIcon className="h-3.5 w-3.5" />
                    }
                    {table.name}
                    <span className="ml-auto font-normal text-ink-500">
                      {table.fields.length} fields
                    </span>
                  </button>
                  {isOpen &&
                  <ul>
                      {table.fields.map((field) => {
                      const added = existingIds.includes(field.id);
                      return (
                        <li key={field.id}>
                            <button
                            type="button"
                            onClick={() => setSelected(field)}
                            className={cx(
                              'flex w-full items-center gap-2 px-3 py-1 text-left text-xs transition-colors duration-150',
                              selected?.id === field.id ?
                              'bg-accent-50 text-accent-700' :
                              'text-ink-700 hover:bg-surface-muted',
                              added && 'opacity-50'
                            )}>
                            
                              <span className="w-8 shrink-0 text-2xs uppercase text-ink-400">
                                {field.dataType.slice(0, 3)}
                              </span>
                              <span className="truncate">{field.name}</span>
                              <span className="ml-auto shrink-0 text-2xs text-ink-400">
                                {added ? 'Added' : field.displayName}
                              </span>
                            </button>
                          </li>);

                    })}
                    </ul>
                  }
                </div>);

            })}
            {visibleTables.length === 0 &&
            <p className="px-3 py-6 text-center text-xs text-ink-500">
                No fields match “{query}”.
              </p>
            }
          </div>
        </div>

        <div className="rounded border border-line bg-surface-muted p-3">
          {selected ?
          <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">Field</dt>
                <dd className="font-medium text-ink-900">{selected.displayName}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">Source</dt>
                <dd className="font-mono text-2xs text-ink-700">{selected.id}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">Data type</dt>
                <dd className="text-ink-700">{selected.dataType}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">Description</dt>
                <dd className="text-ink-700">{selected.description}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">Example</dt>
                <dd className="tabular text-ink-700">{selected.example}</dd>
              </div>
              {related.length > 0 &&
            <div className="border-t border-line pt-2">
                  <dt className="mb-1 flex items-center gap-1 text-2xs uppercase tracking-wide text-ink-500">
                    <LinkIcon className="h-3 w-3" /> Joined automatically
                  </dt>
                  <dd className="space-y-0.5">
                    {related.slice(0, 3).map((rel) =>
                <p
                  key={`${rel.fromTable}-${rel.toTable}-${rel.fromField}`}
                  className="font-mono text-2xs text-ink-700">
                  
                        {rel.fromTable}.{rel.fromField} → {rel.toTable}.{rel.toField}
                      </p>
                )}
                  </dd>
                </div>
            }
            </dl> :

          <p className="text-xs leading-relaxed text-ink-500">
              Select a field to see its data type, description, sample value and the
              relationship the studio will use to join it — no SQL required.
            </p>
          }
        </div>
      </div>
    </Modal>);

}