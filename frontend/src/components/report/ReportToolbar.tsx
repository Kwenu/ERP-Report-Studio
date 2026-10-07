import { useEffect, useRef, useState } from 'react';
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

interface ToolbarProps {
  definition: ReportDefinition;
  onChange: (patch: Partial<ReportDefinition>) => void;
  editing: boolean;
  onToggleEdit: () => void;
  canEdit: boolean;
  isTemplate: boolean;
  isFavorite: boolean;
  onRefresh: () => void;
  refreshing?: boolean;
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

const icon = 'h-3 w-3';

/** A single slim row of actions. Rarely-used actions are icon-only (hover for the name). */
export function ReportToolbar(props: ToolbarProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line bg-white px-3 py-1">
      <Button
        size="xs"
        icon={<RefreshCwIcon className={`${icon} ${props.refreshing ? 'animate-spin' : ''}`} />}
        disabled={props.refreshing}
        onClick={props.onRefresh}>
        
        Refresh
      </Button>
      {props.canEdit &&
      <Button
        size="xs"
        variant={props.editing ? 'primary' : 'default'}
        icon={<PencilIcon className={icon} />}
        onClick={props.onToggleEdit}>
        
          Edit
        </Button>
      }
      <span className="mx-0.5 h-4 w-px bg-line" />
      <Button size="xs" icon={<PlusIcon className={icon} />} onClick={props.onAddField} disabled={!props.canEdit}>
        Add Field
      </Button>
      <Button size="xs" icon={<FilterIcon className={icon} />} onClick={() => props.onOpenPanel('Filters')}>
        Filters
        {props.filterCount > 0 &&
        <span className="rounded bg-accent-500 px-1 text-[10px] leading-4 text-white">{props.filterCount}</span>
        }
      </Button>
      <Button size="xs" icon={<ColumnsIcon className={icon} />} onClick={props.onColumns}>
        Columns
      </Button>
      <Button size="xs" icon={<GroupIcon className={icon} />} onClick={() => props.onOpenPanel('Grouping')}>
        Grouping
      </Button>
      <Button size="xs" icon={<ArrowUpDownIcon className={icon} />} onClick={() => props.onOpenPanel('Sorting')}>
        Sort
      </Button>
      <span className="mx-0.5 h-4 w-px bg-line" />
      <Button
        size="xs"
        variant="primary"
        icon={<SaveIcon className={icon} />}
        onClick={props.onSave}
        disabled={!props.canEdit}>
        
        Save
      </Button>
      <Button size="xs" onClick={props.onSaveAs} disabled={!props.canEdit}>
        Save As
      </Button>
      {props.isTemplate &&
      <Button
        size="icon"
        title="Reset to Default"
        aria-label="Reset to Default"
        onClick={props.onReset}>
        
          <RotateCcwIcon className={icon} />
        </Button>
      }

      <div className="relative" ref={exportRef}>
        <Button size="xs" icon={<DownloadIcon className={icon} />} onClick={() => setExportOpen((o) => !o)}>
          Export
        </Button>
        {exportOpen &&
        <div className="absolute left-0 top-7 z-40 w-36 rounded border border-line bg-white py-1 shadow-pop">
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

      <div className="ml-auto flex items-center gap-1">
        <Button size="icon" title="Print" aria-label="Print" onClick={props.onPrint}>
          <PrinterIcon className={icon} />
        </Button>
        <Button size="icon" title="Share" aria-label="Share" onClick={props.onShare}>
          <Share2Icon className={icon} />
        </Button>
        <Button size="icon" title="Schedule" aria-label="Schedule" onClick={props.onSchedule}>
          <CalendarClockIcon className={icon} />
        </Button>
        <Button
          size="icon"
          variant={props.isFavorite ? 'primary' : 'default'}
          title={props.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label="Favorite"
          aria-pressed={props.isFavorite}
          onClick={props.onFavorite}>
          
          <StarIcon className={icon} />
        </Button>
      </div>
    </div>);

}
