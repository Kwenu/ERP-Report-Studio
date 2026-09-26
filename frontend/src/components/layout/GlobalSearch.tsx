import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { allFields, erpTables } from '../../data/schema';
import { fixedTemplates } from '../../data/templates';
import { customers, openInvoices } from '../../data/mockErpData';
import { useApp } from '../../contexts/AppContext';

interface Hit {
  group: 'Reports' | 'Tables' | 'Fields' | 'Customers' | 'Invoices';
  label: string;
  detail: string;
  to: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { savedReports } = useApp();
  const blurTimer = useRef<number | undefined>(undefined);

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: Hit[] = [];

    fixedTemplates.forEach((t) => {
      if (t.name.toLowerCase().includes(q))
      results.push({
        group: 'Reports',
        label: t.name,
        detail: 'Fixed template',
        to: `/reports/fixed/${t.id}`
      });
    });
    savedReports.forEach((r) => {
      if (r.name.toLowerCase().includes(q))
      results.push({
        group: 'Reports',
        label: r.name,
        detail: `${r.category} · ${r.owner}`,
        to: `/reports/view/${r.id}`
      });
    });
    erpTables.forEach((t) => {
      if (t.name.toLowerCase().includes(q))
      results.push({
        group: 'Tables',
        label: t.name,
        detail: `${t.fields.length} fields · ${t.records.toLocaleString()} records`,
        to: `/tables?table=${t.name}`
      });
    });
    allFields.forEach((f) => {
      if (f.id.toLowerCase().includes(q) || f.displayName.toLowerCase().includes(q))
      results.push({
        group: 'Fields',
        label: f.id,
        detail: `${f.displayName} · ${f.dataType}`,
        to: `/tables?table=${f.table}&field=${f.name}`
      });
    });
    customers.forEach((c) => {
      if (c.toLowerCase().includes(q))
      results.push({
        group: 'Customers',
        label: c,
        detail: 'Customer master record',
        to: `/reports/fixed/open-invoices?customer=${encodeURIComponent(c)}`
      });
    });
    openInvoices.forEach((inv) => {
      if (String(inv.num).toLowerCase().includes(q))
      results.push({
        group: 'Invoices',
        label: String(inv.num),
        detail: `${inv.name} · open`,
        to: `/reports/fixed/open-invoices?invoice=${inv.num}`
      });
    });

    return results.slice(0, 24);
  }, [query, savedReports]);

  const grouped = useMemo(() => {
    const map = new Map<string, Hit[]>();
    hits.forEach((h) => {
      const bucket = map.get(h.group);
      if (bucket) bucket.push(h);else
      map.set(h.group, [h]);
    });
    return Array.from(map.entries());
  }, [hits]);

  return (
    <div className="relative w-full max-w-xl">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 120);
        }}
        placeholder="Search reports, tables, fields, customers, invoices…"
        aria-label="Global search"
        className="h-8 w-full rounded border border-navy-700 bg-navy-800 pl-8 pr-3 text-[13px] text-white placeholder:text-slate-400 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400" />
      
      {open && query.trim().length >= 2 &&
      <div className="absolute left-0 right-0 top-9 z-50 max-h-[420px] overflow-y-auto erp-scroll rounded border border-line bg-white shadow-pop">
          {grouped.length === 0 ?
        <p className="px-3 py-4 text-xs text-ink-500">
              No matches for “{query}”.
            </p> :

        grouped.map(([group, groupHits]) =>
        <div key={group}>
                <p className="sticky top-0 border-b border-line bg-surface-muted px-3 py-1 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                  {group}
                </p>
                <ul>
                  {groupHits.map((hit) =>
            <li key={`${hit.group}-${hit.label}-${hit.to}`}>
                      <button
                type="button"
                onMouseDown={() => {
                  window.clearTimeout(blurTimer.current);
                }}
                onClick={() => {
                  navigate(hit.to);
                  setOpen(false);
                  setQuery('');
                }}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left transition-colors duration-150 hover:bg-accent-50">
                
                        <span className="truncate text-[13px] text-ink-900">
                          {hit.label}
                        </span>
                        <span className="shrink-0 text-2xs text-ink-500">
                          {hit.detail}
                        </span>
                      </button>
                    </li>
            )}
                </ul>
              </div>
        )
        }
        </div>
      }
    </div>);

}