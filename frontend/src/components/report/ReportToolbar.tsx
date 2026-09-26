import { useState } from 'react';
import {
  ColumnsIcon,
  DownloadIcon,
  FilterIcon,
  GroupIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SaveIcon,
  Share2Icon,
  ArrowUpDownIcon,
  StarIcon,
  CalendarClockIcon } from
'lucide-react';
import { Button } from '../ui/Button';
import type { ReportDefinition } from '../../types/erp';
import { inputClass, selectClass } from '../../utils/ui';

interface ToolbarProps {
  definition: ReportDefinition;
  onChange: (patch: Partial<ReportDefinition>) => void;
  editing: boolean;
  onToggleEdit: () => void;
  canEdit: boolean;
  isTemplate: boolean;
  isFavorite: boolean;
  onRefresh: () => void;
  onAddField: () => void;
  onOpenPanel: (tab: 'Fields' | 'Filters' | 'Grouping' | 'Sorting' | 'Formatting' | 'Totals') => void;
  onColumns: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onReset: () => void;
  onExport: (format: 'Excel' | 'CSV' | 'PDF') => void;
  onPrint: () => void;
  onShare: () => void;
  onFavorite: () => void;
  onSchedule: () => void;
  filterCount: number;
}

export function ReportToolbar(props: ToolbarProps) {
  const { definition, onChange } = props;
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 border-b border-line bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" icon={<RefreshCwIcon className="h-3.5 w-3.5" />} onClick={props.onRefresh}>
          Refresh
        </Button>
        {props.canEdit &&
        <Button
          size="sm"
          variant={props.editing ? 'primary' : 'default'}
          icon={<PencilIcon className="h-3.5 w-3.5" />}
          onClick={props.onToggleEdit}>
          
            Edit
          </Button>
        }
        <span className="mx-1 h-5 w-px bg-line" />
        <Button
          size="sm"
          icon={<PlusIcon className="h-3.5 w-3.5" />}
          onClick={props.onAddField}
          disabled={!props.canEdit}>
          
          Add Field
        </Button>
        <Button
          size="sm"
          icon={<FilterIcon className="h-3.5 w-3.5" />}
          onClick={() => props.onOpenPanel('Filters')}>
          
          Filters
          {props.filterCount > 0 &&
          <span className="ml-1 rounded bg-accent-500 px-1 text-2xs text-white">
              {props.filterCount}
            </span>
          }
        </Button>
        <Button size="sm" icon={<ColumnsIcon className="h-3.5 w-3.5" />} onClick={props.onColumns}>
          Columns
        </Button>
        <Button
          size="sm"
          icon={<GroupIcon className="h-3.5 w-3.5" />}
          onClick={() => props.onOpenPanel('Grouping')}>
          
          Grouping
        </Button>
        <Button
          size="sm"
          icon={<ArrowUpDownIcon className="h-3.5 w-3.5" />}
          onClick={() => props.onOpenPanel('Sorting')}>
          
          Sort
        </Button>
        <span className="mx-1 h-5 w-px bg-line" />
        <Button
          size="sm"
          variant="primary"
          icon={<SaveIcon className="h-3.5 w-3.5" />}
          onClick={props.onSave}
          disabled={!props.canEdit}>
          
          Save
        </Button>
        <Button size="sm" onClick={props.onSaveAs} disabled={!props.canEdit}>
          Save As
        </Button>
        {props.isTemplate &&
        <Button size="sm" icon={<RotateCcwIcon className="h-3.5 w-3.5" />} onClick={props.onReset}>
            Reset to Default
          </Button>
        }

        <div className="relative">
          <Button
            size="sm"
            icon={<DownloadIcon className="h-3.5 w-3.5" />}
            onClick={() => setExportOpen((o) => !o)}>
            
            Export
          </Button>
          {exportOpen &&
          <div className="absolute right-0 top-8 z-40 w-36 rounded border border-line bg-white py-1 shadow-pop">
              {(['Excel', 'CSV', 'PDF'] as const).map((format) =>
            <button
              key={format}
              type="button"
              onClick={() => {
                props.onExport(format);
                setExportOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink-700 transition-colors duration-150 hover:bg-surface-muted">
              
                  Export to {format}
                </button>
            )}
            </div>
          }
        </div>

        <Button size="sm" icon={<PrinterIcon className="h-3.5 w-3.5" />} onClick={props.onPrint}>
          Print
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" icon={<Share2Icon className="h-3.5 w-3.5" />} onClick={props.onShare}>
            Share
          </Button>
          <Button
            size="sm"
            icon={<CalendarClockIcon className="h-3.5 w-3.5" />}
            onClick={props.onSchedule}>
            
            Schedule
          </Button>
          <Button
            size="sm"
            variant={props.isFavorite ? 'primary' : 'default'}
            icon={<StarIcon className="h-3.5 w-3.5" />}
            onClick={props.onFavorite}
            aria-pressed={props.isFavorite}>
            
            Favorite
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-2">
        {definition.dateFrom !== undefined &&
        <div className="flex items-center gap-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
              Dates
            </span>
            <input
            type="date"
            aria-label="From date"
            value={definition.dateFrom ?? ''}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
            className={`${inputClass} h-7 w-[140px] text-xs`} />
          
            <span className="text-xs text-ink-500">to</span>
            <input
            type="date"
            aria-label="To date"
            value={definition.dateTo ?? ''}
            onChange={(e) => onChange({ dateTo: e.target.value })}
            className={`${inputClass} h-7 w-[140px] text-xs`} />
          
          </div>
        }
        {definition.basis &&
        <div className="flex items-center gap-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
              Basis
            </span>
            <div className="flex overflow-hidden rounded border border-line">
              {(['Accrual', 'Cash'] as const).map((basis) =>
            <button
              key={basis}
              type="button"
              onClick={() => onChange({ basis })}
              className={
              definition.basis === basis ?
              'bg-accent-500 px-2.5 py-1 text-xs font-medium text-white' :
              'bg-white px-2.5 py-1 text-xs text-ink-700 transition-colors duration-150 hover:bg-surface-muted'
              }>
              
                  {basis}
                </button>
            )}
            </div>
          </div>
        }
        <div className="flex items-center gap-1.5">
          <span className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
            Group by
          </span>
          <select
            aria-label="Group by"
            value={definition.groupBy ?? ''}
            onChange={(e) => onChange({ groupBy: e.target.value || null })}
            className={`${selectClass} h-7 w-[170px] text-xs`}>
            
            <option value="">No grouping</option>
            <option value="name">Customer</option>
            <option value="rep">Sales Representative</option>
            <option value="item">Item</option>
            <option value="date">Date</option>
            <option value="terms">Terms</option>
            <option value="category">Category</option>
          </select>
        </div>
      </div>
    </div>);

}