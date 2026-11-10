import { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, UsersIcon } from 'lucide-react';
import type { SelectOption } from '../ui/SearchableSelect';
import { MultiSearchableSelect } from '../ui/MultiSearchableSelect';
import { Button } from '../ui/Button';
import { fetchDatasetRows } from '../../services/erpApi';
import { formatMoney } from '../../utils/format';

interface ArCustomer {
  code: string;
  name: string;
  balance: number | null;
  currency: string;
}

interface ArCustomerSwitcherProps {
  /** Codes of the customers currently shown (one or several; empty while none) */
  customerIds: string[];
  /** Name of the customer when exactly one was opened (used until the customer list has loaded) */
  customerName: string;
  /** Called with the chosen customers; the page then loads all their documents in one report. */
  onSelect: (codes: string[]) => void;
}

/**
 * Sits at the top of the "AR Report - Customer Details" page: the same customer list as the AR Report, so other
 * customers can be opened straight from here, without going back to the AR Report first.
 * Tick one or MANY customers in the searchable list and press Apply: all their documents are shown in ONE report.
 * With exactly one customer ticked the ‹ › buttons step through the customers (in the AR Report's A-Z order).
 */
export function ArCustomerSwitcher({ customerIds, customerName, onSelect }: ArCustomerSwitcherProps) {
  const [customers, setCustomers] = useState<ArCustomer[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    // The AR Report's own data: one row per customer (code, name, balance).
    fetchDatasetRows({ dataset: 'arSummary', dateFrom: undefined, dateTo: undefined, filters: [] }).
    then((response) => {
      if (cancelled) return;
      const list = response.rows.
      filter((r) => r.customerId !== null && r.customerId !== undefined && String(r.customerId).trim() !== '').
      map((r) => ({
        code: String(r.customerId).trim(),
        name: String(r.name ?? '').trim(),
        balance: r.balance === null || r.balance === undefined || r.balance === '' ? null : Number(r.balance),
        currency: String(r.currency ?? '')
      })).
      sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code));
      setCustomers(list);
      setState('ready');
    }).
    catch((err: Error) => {
      if (cancelled) return;
      setError(err.message);
      setState('error');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const options: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = customers.map((c) => ({
      value: c.code,
      label: c.name ? `${c.name}  (${c.code})` : c.code,
      hint: c.balance === null || Number.isNaN(c.balance) ? undefined : formatMoney(c.balance, c.currency)
    }));
    // The customers that were opened are always in the list, even when the AR Report does not list them.
    customerIds.forEach((id) => {
      if (!customers.some((c) => c.code === id)) {
        list.unshift({ value: id, label: customerIds.length === 1 && customerName ? `${customerName}  (${id})` : id });
      }
    });
    return list;
  }, [customers, customerIds, customerName]);

  const single = customerIds.length === 1 ? customerIds[0] : '';
  const index = single ? options.findIndex((o) => o.value === single) : -1;
  const step = (delta: number) => {
    const next = options[index + delta];
    if (next) onSelect([next.value]);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-white px-5 py-2 print:hidden">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
        <UsersIcon className="h-3.5 w-3.5 text-accent-600" /> Customers
      </span>

      <Button
        size="xs"
        icon={<ChevronLeftIcon className="h-3 w-3" />}
        disabled={state !== 'ready' || index <= 0}
        onClick={() => step(-1)}
        aria-label="Previous customer">
        
        Prev
      </Button>

      <MultiSearchableSelect
        ariaLabel="Customers"
        options={options}
        value={customerIds}
        onChange={onSelect}
        placeholder={state === 'loading' ? 'Loading customers…' : 'Select one or more customers'}
        emptyText="No customers found"
        widthClass="w-[380px] max-w-full"
        panelClass="w-[520px]"
        size="normal" />
      

      <Button
        size="xs"
        disabled={state !== 'ready' || index < 0 || index >= options.length - 1}
        onClick={() => step(1)}
        aria-label="Next customer">
        
        Next
        <ChevronRightIcon className="h-3 w-3" />
      </Button>

      {state === 'loading' &&
      <span className="flex items-center gap-1 text-2xs text-ink-500">
          <Loader2Icon className="h-3 w-3 animate-spin" /> Loading customers…
        </span>
      }
      {state === 'ready' &&
      <span className="text-2xs text-ink-500">
          {customers.length.toLocaleString()} customers · tick several to see them together · balances as in the AR Report
        </span>
      }
      {state === 'error' &&
      <span className="text-2xs text-red-700">Could not load the customer list: {error}</span>
      }
    </div>);

}
