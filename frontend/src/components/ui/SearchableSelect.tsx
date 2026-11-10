import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { AnchoredPanel } from './AnchoredPanel';

export interface SelectOption {
  value: string;
  label: string;
  /** Small right-aligned text (e.g. a balance) */
  hint?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Text of the "no selection" entry, e.g. "All customers". Leave out when a value must always be chosen. */
  allLabel?: string;
  placeholder?: string;
  ariaLabel: string;
  /** Tailwind width class of the button, e.g. "w-[200px]" */
  widthClass?: string;
  /** Width of the drop-down panel */
  panelClass?: string;
  disabled?: boolean;
  emptyText?: string;
  size?: 'compact' | 'normal';
}

const MAX_SHOWN = 300;

/**
 * A drop-down with a search box. Customer lists can hold hundreds of names, which a plain <select> makes
 * hard to use. Keyboard: type to search, ↑ ↓ to move, Enter to pick, Esc to close.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  allLabel,
  placeholder = 'Select…',
  ariaLabel,
  widthClass = 'w-[200px]',
  panelClass = 'w-[320px]',
  disabled = false,
  emptyText = 'Nothing found',
  size = 'compact'
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    return list;
  }, [options, query]);

  /** The rows shown: the optional "All" entry first, then the matches (capped so a huge list stays fast). */
  const rows: SelectOption[] = useMemo(() => {
    const head = allLabel && !query.trim() ? [{ value: '', label: allLabel }] : [];
    return [...head, ...filtered.slice(0, MAX_SHOWN)];
  }, [allLabel, filtered, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      const idx = Math.max(0, (allLabel ? [{ value: '' }, ...options] : options).findIndex((o) => o.value === value));
      setActive(idx);
      // focus after the panel is painted
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const close = useCallback(() => setOpen(false), []);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(rows.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rows[active]) pick(rows[active].value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const height = size === 'compact' ? 'h-6 text-[11px]' : 'h-8 text-[13px]';
  const hasValue = value !== '';

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
        hasValue ? 'border-accent-400' : 'border-line'}`
        }>
        
        <span className={`truncate ${selected || hasValue ? '' : 'text-ink-500'}`}>
          {selected ? selected.label : hasValue ? value : allLabel ?? placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-0.5">
          {hasValue && allLabel && !disabled &&
          <span
            role="button"
            tabIndex={-1}
            aria-label={`Clear ${ariaLabel}`}
            title="Clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="rounded p-0.5 text-ink-400 hover:bg-surface-muted hover:text-ink-700">
            
              <XIcon className="h-3 w-3" />
            </span>
          }
          <ChevronDownIcon className="h-3 w-3 text-ink-400" />
        </span>
      </button>

      {/* The list is drawn on <body> (fixed position), so opening it can never stretch or scroll the report page. */}
      <AnchoredPanel anchorRef={rootRef} open={open} className={panelClass} onClose={close}>
          <div className="relative shrink-0 border-b border-line p-1.5">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-400" />
            <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type to search…"
            aria-label={`Search ${ariaLabel}`}
            className="h-7 w-full rounded border border-line bg-white pl-6 pr-2 text-[12px] text-ink-900 placeholder:text-ink-400 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-300" />
          
          </div>
          <ul ref={listRef} role="listbox" className="erp-scroll min-h-0 flex-1 overflow-y-auto py-1">
            {rows.length === 0 &&
          <li className="px-3 py-2 text-[12px] text-ink-500">{emptyText}</li>
          }
            {rows.map((o, i) =>
          <li
            key={`${o.value}|${i}`}
            role="option"
            aria-selected={o.value === value}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(o.value)}
            className={`flex cursor-pointer items-center gap-2 px-2.5 py-1 text-[12px] ${
            i === active ? 'bg-accent-50 text-ink-900' : 'text-ink-800'} ${
            o.value === '' ? 'italic text-ink-600' : ''}`
            }>
            
                <CheckIcon className={`h-3 w-3 shrink-0 ${o.value === value ? 'text-accent-600' : 'text-transparent'}`} />
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && <span className="tabular shrink-0 text-2xs text-ink-500">{o.hint}</span>}
              </li>
          )}
            {filtered.length > MAX_SHOWN &&
          <li className="px-3 py-1.5 text-2xs text-ink-500">
                Showing the first {MAX_SHOWN} of {filtered.length.toLocaleString()} — type to narrow the list.
              </li>
          }
          </ul>
        </AnchoredPanel>
    </div>);

}
