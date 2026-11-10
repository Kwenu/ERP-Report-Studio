import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, SearchIcon, SquareCheckIcon, SquareIcon } from 'lucide-react';
import { AnchoredPanel } from './AnchoredPanel';
import type { SelectOption } from './SearchableSelect';

interface MultiSearchableSelectProps {
  options: SelectOption[];
  /** The selected values. */
  value: string[];
  /** Called when the user presses Apply (or closes the list with changes) — not on every tick, so the report reloads once. */
  onChange: (values: string[]) => void;
  ariaLabel: string;
  placeholder?: string;
  emptyText?: string;
  widthClass?: string;
  panelClass?: string;
  disabled?: boolean;
  size?: 'compact' | 'normal';
}

const MAX_SHOWN = 300;

/**
 * Searchable drop-down with check boxes: tick as many customers as needed, then Apply.
 * "Select all shown" ticks everything the search currently lists (handy to pick e.g. every "Packaging" customer).
 */
export function MultiSearchableSelect({
  options,
  value,
  onChange,
  ariaLabel,
  placeholder = 'Select…',
  emptyText = 'Nothing found',
  widthClass = 'w-[380px]',
  panelClass = 'w-[480px]',
  disabled = false,
  size = 'normal'
}: MultiSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>(value);
  /** Always the latest ticks, so closing the list by clicking away can apply them. */
  const draftRef = useRef<string[]>(value);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start every opening from the applied selection.
  useEffect(() => {
    if (open) {
      setDraft(value);
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const labelOf = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const shown = filtered.slice(0, MAX_SHOWN);

  const draftSet = useMemo(() => new Set(draft), [draft]);
  const changed = draft.length !== value.length || draft.some((v) => !value.includes(v));

  const toggle = (v: string) => setDraft((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
  const allShownSelected = shown.length > 0 && shown.every((o) => draftSet.has(o.value));
  const toggleShown = () =>
    setDraft((d) => {
      if (allShownSelected) {
        const drop = new Set(shown.map((o) => o.value));
        return d.filter((v) => !drop.has(v));
      }
      return [...new Set([...d, ...shown.map((o) => o.value)])];
    });

  const apply = () => {
    setOpen(false);
    if (changed && draft.length > 0) onChange(draft);
  };
  // Clicking away applies what was ticked (so nothing is lost), exactly like pressing Apply. Cancel / Esc discard.
  const close = useCallback(() => {
    setOpen(false);
    const d = draftRef.current;
    const differs = d.length !== value.length || d.some((v) => !value.includes(v));
    if (differs && d.length > 0) onChange(d);
  }, [onChange, value]);

  const height = size === 'compact' ? 'h-6 text-[11px]' : 'h-8 text-[13px]';
  const summary =
  value.length === 0 ?
  placeholder :
  value.length === 1 ?
  labelOf.get(value[0]) ?? value[0] :
  `${value.length} customers selected`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${height} ${widthClass} flex items-center justify-between gap-1 rounded border bg-white px-1.5 text-left text-ink-900 transition-colors duration-150 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-300 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-400 ${
        value.length ? 'border-accent-400' : 'border-line'}`
        }>

        <span className={`truncate ${value.length ? '' : 'text-ink-500'}`}>{summary}</span>
        <ChevronDownIcon className="h-3 w-3 shrink-0 text-ink-400" />
      </button>

      <AnchoredPanel anchorRef={rootRef} open={open} className={panelClass} onClose={close}>
        <div className="relative shrink-0 border-b border-line p-1.5">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                apply();
              }
            }}
            placeholder="Type to search…"
            aria-label={`Search ${ariaLabel}`}
            className="h-7 w-full rounded border border-line bg-white pl-6 pr-2 text-[12px] text-ink-900 placeholder:text-ink-400 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-300" />

        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-line px-2.5 py-1 text-2xs text-ink-600">
          <button type="button" onClick={toggleShown} disabled={shown.length === 0} className="font-medium text-accent-700 hover:underline disabled:text-ink-400 disabled:no-underline">
            {allShownSelected ? 'Unselect all shown' : `Select all shown (${Math.min(filtered.length, MAX_SHOWN).toLocaleString()})`}
          </button>
          <button type="button" onClick={() => setDraft([])} disabled={draft.length === 0} className="font-medium text-ink-600 hover:underline disabled:text-ink-400 disabled:no-underline">
            Clear selection
          </button>
        </div>

        <ul role="listbox" aria-multiselectable="true" className="erp-scroll min-h-0 flex-1 overflow-y-auto py-1">
          {shown.length === 0 && <li className="px-3 py-2 text-[12px] text-ink-500">{emptyText}</li>}
          {shown.map((o) => {
            const on = draftSet.has(o.value);
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={on}
                onClick={() => toggle(o.value)}
                className={`flex cursor-pointer items-center gap-2 px-2.5 py-1 text-[12px] hover:bg-accent-50 ${on ? 'bg-accent-50/60 text-ink-900' : 'text-ink-800'}`}>

                {on ? <SquareCheckIcon className="h-3.5 w-3.5 shrink-0 text-accent-600" /> : <SquareIcon className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && <span className="tabular shrink-0 text-2xs text-ink-500">{o.hint}</span>}
              </li>);

          })}
          {filtered.length > MAX_SHOWN &&
          <li className="px-3 py-1.5 text-2xs text-ink-500">
              Showing the first {MAX_SHOWN} of {filtered.length.toLocaleString()} — type to narrow the list.
            </li>
          }
        </ul>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-surface-muted px-2.5 py-1.5">
          <span className="flex items-center gap-1 text-2xs text-ink-600">
            <CheckIcon className="h-3 w-3 text-accent-600" />
            {draft.length.toLocaleString()} selected
          </span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setOpen(false)} className="h-6 rounded border border-line bg-white px-2 text-[11px] text-ink-700 hover:bg-surface-muted">
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={draft.length === 0}
              className="h-6 rounded border border-accent-600 bg-accent-500 px-2.5 text-[11px] font-medium text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50">

              Apply
            </button>
          </div>
        </div>
      </AnchoredPanel>
    </div>);

}
