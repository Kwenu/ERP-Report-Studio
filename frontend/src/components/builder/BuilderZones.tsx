import { useEffect, useState, type ReactNode } from 'react';
import { XIcon, SigmaIcon, LayoutListIcon, ColumnsIcon, FilterIcon, GroupIcon, ArrowUpDownIcon } from 'lucide-react';
import type { ReportColumn, ReportDefinition } from '../../types/erp';
import { findField } from '../../data/schema';
import { cx } from '../../utils/ui';

export type ZoneId = 'rows' | 'columns' | 'values' | 'filters' | 'groupBy' | 'sortBy';

const zoneMeta: {id: ZoneId;label: string;hint: string;icon: ReactNode;}[] = [
{ id: 'rows', label: 'Rows', hint: 'Leading detail fields', icon: <LayoutListIcon className="h-3.5 w-3.5" /> },
{ id: 'columns', label: 'Columns', hint: 'Additional detail fields', icon: <ColumnsIcon className="h-3.5 w-3.5" /> },
{ id: 'values', label: 'Values', hint: 'Numeric measures', icon: <SigmaIcon className="h-3.5 w-3.5" /> },
{ id: 'filters', label: 'Filters', hint: 'Restrict the records', icon: <FilterIcon className="h-3.5 w-3.5" /> },
{ id: 'groupBy', label: 'Group By', hint: 'One grouping level', icon: <GroupIcon className="h-3.5 w-3.5" /> },
{ id: 'sortBy', label: 'Sort By', hint: 'Row ordering', icon: <ArrowUpDownIcon className="h-3.5 w-3.5" /> }];


interface BuilderZonesProps {
  definition: ReportDefinition;
  zoneOf: Record<string, ZoneId>;
  onDropField: (fieldId: string, zone: ZoneId) => void;
  onRemoveColumn: (columnId: string) => void;
  onRemoveFilter: (filterId: string) => void;
  onClearGroup: () => void;
  onRemoveSort: (key: string) => void;
}

export function BuilderZones({
  definition,
  zoneOf,
  onDropField,
  onRemoveColumn,
  onRemoveFilter,
  onClearGroup,
  onRemoveSort
}: BuilderZonesProps) {
  const [activeZone, setActiveZone] = useState<ZoneId | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const start = () => setDragging(true);
    const end = () => {
      setDragging(false);
      setActiveZone(null);
    };
    window.addEventListener('dragstart', start);
    window.addEventListener('dragend', end);
    window.addEventListener('drop', end);
    return () => {
      window.removeEventListener('dragstart', start);
      window.removeEventListener('dragend', end);
      window.removeEventListener('drop', end);
    };
  }, []);

  const chipsFor = (zone: ZoneId): {id: string;label: string;note?: string;onRemove: () => void;}[] => {
    if (zone === 'filters')
    return definition.filters.map((f) => ({
      id: f.id,
      label: f.label,
      note: f.operator,
      onRemove: () => onRemoveFilter(f.id)
    }));
    if (zone === 'groupBy')
    return definition.groupBy ?
    [
    {
      id: definition.groupBy,
      label:
      definition.columns.find((c) => c.key === definition.groupBy)?.label ??
      definition.groupBy,
      onRemove: onClearGroup
    }] :

    [];
    if (zone === 'sortBy')
    return definition.sort.map((s) => ({
      id: s.key,
      label: s.label,
      note: s.dir === 'asc' ? 'A→Z' : 'Z→A',
      onRemove: () => onRemoveSort(s.key)
    }));
    return definition.columns.
    filter((c) => (zoneOf[c.id] ?? 'columns') === zone).
    map((c: ReportColumn) => ({
      id: c.id,
      label: c.label,
      note: zone === 'values' ? c.aggregation.toUpperCase() : undefined,
      onRemove: () => onRemoveColumn(c.id)
    }));
  };

  return (
    <div className="grid grid-cols-3 gap-2 border-b border-line bg-surface-muted p-2 xl:grid-cols-6">
      {zoneMeta.map((zone) => {
        const chips = chipsFor(zone.id);
        const isActive = activeZone === zone.id;
        return (
          <div
            key={zone.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setActiveZone(zone.id);
            }}
            onDragLeave={() => setActiveZone((z) => z === zone.id ? null : z)}
            onDrop={(e) => {
              e.preventDefault();
              const fieldId = e.dataTransfer.getData('text/plain');
              if (fieldId && findField(fieldId)) onDropField(fieldId, zone.id);
              setActiveZone(null);
              setDragging(false);
            }}
            className={cx(
              'flex min-h-[86px] flex-col rounded border bg-white p-1.5 transition-colors duration-150',
              isActive ?
              'border-accent-500 bg-accent-50 ring-1 ring-accent-300' :
              dragging ?
              'border-dashed border-accent-300' :
              'border-line'
            )}>
            
            <p className="mb-1 flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-ink-500">
              <span className="text-accent-600">{zone.icon}</span>
              {zone.label}
              {chips.length > 0 &&
              <span className="ml-auto rounded bg-surface-sunken px-1 font-normal text-ink-500">
                  {chips.length}
                </span>
              }
            </p>
            {chips.length === 0 ?
            <p className="flex flex-1 items-center justify-center rounded border border-dashed border-line px-1 text-center text-2xs leading-tight text-ink-400">
                {dragging ? 'Drop here' : zone.hint}
              </p> :

            <ul className="flex flex-1 flex-col gap-1 overflow-y-auto erp-scroll">
                {chips.map((chip) =>
              <li
                key={chip.id}
                className="flex items-center gap-1 rounded border border-line bg-surface-muted px-1.5 py-0.5 text-2xs text-ink-700">
                
                    <span className="min-w-0 flex-1 truncate">{chip.label}</span>
                    {chip.note &&
                <span className="shrink-0 text-[9px] uppercase text-ink-400">
                        {chip.note}
                      </span>
                }
                    <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Remove ${chip.label}`}
                  className="shrink-0 rounded text-ink-400 transition-colors duration-150 hover:text-red-600">
                  
                      <XIcon className="h-3 w-3" />
                    </button>
                  </li>
              )}
              </ul>
            }
          </div>);

      })}
    </div>);

}