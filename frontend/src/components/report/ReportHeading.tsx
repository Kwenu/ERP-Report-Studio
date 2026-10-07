import type { ReportDefinition } from '../../types/erp';
import { formatDate, monthLabel, todayIso } from '../../utils/format';

function periodLabel(def: ReportDefinition): string {
  if (!def.dateFrom || !def.dateTo) return `As of ${formatDate(todayIso())}`;
  if (def.dateFrom === def.dateTo) return formatDate(def.dateFrom);
  const sameMonth = def.dateFrom.slice(0, 7) === def.dateTo.slice(0, 7);
  const startsFirst = def.dateFrom.endsWith('-01');
  if (sameMonth && startsFirst) return monthLabel(def.dateFrom);
  return `${formatDate(def.dateFrom)} — ${formatDate(def.dateTo)}`;
}

export function ReportHeading({ definition }: {definition: ReportDefinition;}) {
  return (
    <>
      {/* On screen: one slim line, so the data gets the room. */}
      <div className="flex items-baseline justify-center gap-2 border-b border-line bg-white px-4 py-1 text-xs text-ink-700 print:hidden">
        <span className="font-semibold text-ink-900">Polydime</span>
        <span className="text-ink-400">·</span>
        <span className="font-semibold text-ink-900">{definition.name}</span>
        <span className="text-ink-400">·</span>
        <span>{periodLabel(definition)}</span>
        {definition.basis &&
        <>
            <span className="text-ink-400">·</span>
            <span className="text-2xs uppercase tracking-wide text-ink-500">Basis: {definition.basis}</span>
          </>
        }
      </div>

      {/* On paper / PDF: the full centred report heading. */}
      <div className="hidden border-b border-line bg-white px-5 py-3 text-center print:block">
        <p className="text-[13px] font-semibold tracking-wide text-ink-900">Polydime</p>
        <h2 className="text-base font-bold text-ink-900">{definition.name}</h2>
        {definition.subtitle && <p className="text-xs text-ink-700">{definition.subtitle}</p>}
        <p className="text-xs text-ink-700">{periodLabel(definition)}</p>
        {definition.basis &&
        <p className="mt-0.5 text-2xs uppercase tracking-wide text-ink-500">Report Basis: {definition.basis}</p>
        }
      </div>
    </>);

}
