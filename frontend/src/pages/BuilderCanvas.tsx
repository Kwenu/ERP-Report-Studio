import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDownIcon, ChevronUpIcon, MousePointerClickIcon } from 'lucide-react';
import { FieldTree } from '../components/builder/FieldTree';
import { BuilderZones, type ZoneId } from '../components/builder/BuilderZones';
import { ReportWorkspace } from '../components/report/ReportWorkspace';
import { CalculatedFieldDialog } from '../components/builder/CalculatedFieldDialog';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { findField } from '../data/schema';
import { useErpConnection } from '../contexts/ErpConnectionContext';
import {
  blankReport,
  cloneDefinition,
  columnFromField,
  getTemplate } from
'../data/templates';
import type { ColumnZone, DatasetId, ErpField, ReportDefinition } from '../types/erp';
import { compactInputClass, compactSelectClass } from '../utils/ui';
import { useApp } from '../contexts/AppContext';

const zoneOrder: ZoneId[] = ['rows', 'columns', 'values'];

const datasetOptions: {id: DatasetId;label: string;}[] = [
{ id: 'salesLines', label: 'Sales invoice detail (Invoices + InvoiceLines)' },
{ id: 'paymentTxns', label: 'Payment transactions (Invoices + Payments)' },
{ id: 'openInvoices', label: 'Open invoices as of today' }];


type BuilderState = {definition: ReportDefinition;zoneOf: Record<string, ZoneId>;};

const isNumericType = (t: ErpField['dataType']) => t === 'currency' || t === 'decimal' || t === 'integer';

/** Why this field cannot join the report as it stands (a report reads ONE source), or null when it can. */
function sourceConflict(def: ReportDefinition, field: ErpField, live: boolean): string | null {
  const inUse = def.columns.length > 0 || def.filters.length > 0 || def.sort.length > 0 || Boolean(def.groupBy);
  if (!inUse) return null;
  if (live) {
    if (def.dataset !== 'erpTable') {
      return 'This report started from a standard report template. Remove its fields, or start a new report, to build on an ERP table.';
    }
    if (def.sourceTable !== field.table) {
      return `This report reads the ${def.sourceTable} table. A report uses one table at a time — remove its fields or start a new report to use ${field.table}.`;
    }
    return null;
  }
  if (def.dataset === 'erpTable') {
    return `This report reads the ${def.sourceTable} table. Remove its fields to switch to the standard report fields.`;
  }
  return null;
}

/** Points the report at the right source for the field being added (a real ERP table, or a standard dataset). */
function applySourceFor(prev: BuilderState, field: ErpField, live: boolean): BuilderState {
  const def = prev.definition;
  if (live) {
    if (def.dataset === 'erpTable' && def.sourceTable === field.table) return prev;
    return { ...prev, definition: { ...def, dataset: 'erpTable', sourceTable: field.table } };
  }
  if (def.dataset === 'erpTable') {
    return { ...prev, definition: { ...def, dataset: 'salesLines', sourceTable: undefined } };
  }
  return prev;
}

function initialDefinition(templateId: string | null): {
  definition: ReportDefinition;
  zoneOf: Record<string, ZoneId>;
} {
  if (templateId) {
    const template = getTemplate(templateId);
    if (template) {
      const copy = cloneDefinition(template);
      copy.id = `draft-${Date.now()}`;
      copy.name = `${template.name} (Draft)`;
      copy.type = 'Custom Report';
      copy.templateId = template.id;
      copy.columns = copy.columns.map((c) => ({ ...c, locked: false }));
      const zoneOf: Record<string, ZoneId> = {};
      copy.columns.forEach((c) => {
        zoneOf[c.id] = c.aggregation === 'none' ? 'rows' : 'values';
      });
      return { definition: copy, zoneOf };
    }
  }
  return { definition: blankReport(), zoneOf: {} };
}

export function BuilderCanvas() {
  const [searchParams] = useSearchParams();
  const { currentUser, logAction } = useApp();
  const { findSchemaField } = useErpConnection();
  const [state, setState] = useState(() =>
  initialDefinition(searchParams.get('template'))
  );
  const [calcOpen, setCalcOpen] = useState(false);
  const [zonesOpen, setZonesOpen] = useState(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  const { definition, zoneOf } = state;

  const setDefinition = useCallback(
    (next: ReportDefinition) => setState((prev) => ({ ...prev, definition: next })),
    []
  );

  const orderColumns = (
  columns: ReportDefinition['columns'],
  zones: Record<string, ZoneId>) =>

  [...columns].sort(
    (a, b) =>
    zoneOrder.indexOf(zones[a.id] ?? 'columns') -
    zoneOrder.indexOf(zones[b.id] ?? 'columns')
  );

  const addFieldToZone = useCallback((field: ErpField, zone: ZoneId) => {
    const live = Boolean(findSchemaField(field.id));
    setState((prevState) => {
      const prev = applySourceFor(prevState, field, live);
      const { definition: def, zoneOf: zones } = prev;
      const key = field.key ?? field.name;

      if (zone === 'filters') {
        if (def.filters.some((f) => f.key === key)) return prev;
        return {
          ...prev,
          definition: {
            ...def,
            filters: [
            ...def.filters,
            {
              id: `f-${Date.now()}`,
              key,
              label: field.displayName,
              dataType: field.dataType,
              operator:
              field.dataType === 'date' ?
              'is between' as const :
              field.dataType === 'currency' || field.dataType === 'decimal' ?
              'greater than' as const :
              'equals' as const,
              value: '',
              value2: '',
              connector: 'AND' as const
            }]

          }
        };
      }

      if (zone === 'groupBy') {
        return { ...prev, definition: { ...def, groupBy: key } };
      }

      if (zone === 'sortBy') {
        if (def.sort.some((s) => s.key === key)) return prev;
        return {
          ...prev,
          definition: {
            ...def,
            sort: [...def.sort, { key, label: field.displayName, dir: 'asc' as const }]
          }
        };
      }

      const columnZone = zone as ColumnZone;
      const measure = isNumericType(field.dataType) ? 'sum' as const : 'count' as const;

      // Dropping a field that is already in the report moves it to the new zone.
      const existing = def.columns.find((c) => c.id === field.id);
      if (existing) {
        const moved = {
          ...existing,
          zone: columnZone,
          aggregation: zone === 'values' ? existing.aggregation === 'none' ? measure : existing.aggregation : 'none' as const
        };
        const zones3 = { ...zones, [field.id]: zone };
        return {
          definition: {
            ...def,
            columns: orderColumns(def.columns.map((c) => c.id === field.id ? moved : c), zones3)
          },
          zoneOf: zones3
        };
      }

      const column = { ...columnFromField(field), zone: columnZone };
      column.aggregation = zone === 'values' ? measure : 'none';
      const zones2 = { ...zones, [field.id]: zone };
      return {
        definition: { ...def, columns: orderColumns([...def.columns, column], zones2) },
        zoneOf: zones2
      };
    });
  }, [findSchemaField]);

  /** Adds the field unless it would mix sources; explains why when it cannot. Returns true when added. */
  const addChecked = (field: ErpField, zone: ZoneId): boolean => {
    const live = Boolean(findSchemaField(field.id));
    const conflict = sourceConflict(stateRef.current.definition, field, live);
    if (conflict) {
      toast.error(conflict);
      return false;
    }
    addFieldToZone(field, zone);
    return true;
  };

  const handleDropField = (fieldId: string, zone: ZoneId) => {
    const field = findSchemaField(fieldId) ?? findField(fieldId);
    if (!field) return;
    if (addChecked(field, zone)) {
      toast.success(`${field.displayName} added to ${zone === 'groupBy' ? 'Group By' : zone}`);
    }
  };

  const removeColumn = (columnId: string) =>
  setState((prev) => ({
    definition: {
      ...prev.definition,
      columns: prev.definition.columns.filter((c) => c.id !== columnId)
    },
    zoneOf: Object.fromEntries(
      Object.entries(prev.zoneOf).filter(([id]) => id !== columnId)
    )
  }));

  return (
    <div className="flex h-full min-h-0">
      <FieldTree
        onFieldActivate={(field) => addChecked(field, 'rows')}
        usedFieldIds={definition.columns.map((c) => c.id)} />
      

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-1">
          <input
            aria-label="Report name"
            className={`${compactInputClass} h-7 w-60 text-xs font-medium`}
            value={definition.name}
            onChange={(e) => setDefinition({ ...definition, name: e.target.value })} />
          
          <select
            aria-label="Report data source"
            className={`${compactSelectClass} h-7 w-[300px] text-xs`}
            value={definition.dataset}
            onChange={(e) => {
              const next = e.target.value as DatasetId;
              if (next === 'erpTable') return;
              if (definition.dataset === 'erpTable') {
                // Leaving an ERP table: its fields do not exist in the standard datasets, so start clean.
                setState({
                  definition: {
                    ...definition,
                    dataset: next,
                    sourceTable: undefined,
                    columns: [],
                    filters: [],
                    sort: [],
                    groupBy: null,
                    calculatedFields: []
                  },
                  zoneOf: {}
                });
                toast.info('Fields cleared — they belonged to an ERP table.');
                return;
              }
              setDefinition({ ...definition, dataset: next });
            }}>
            
            {datasetOptions.map((option) =>
            <option key={option.id} value={option.id}>
                {option.label}
              </option>
            )}
            <option value="erpTable" disabled={definition.dataset !== 'erpTable'}>
              {definition.dataset === 'erpTable' ?
              `ERP table: ${definition.sourceTable}` :
              'ERP table (drag a field from the left)'}
            </option>
          </select>
          <Button size="xs" onClick={() => setCalcOpen(true)}>Calculated field</Button>
          <Button
            size="xs"
            aria-expanded={zonesOpen}
            icon={zonesOpen ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
            onClick={() => setZonesOpen((o) => !o)}>
            
            {zonesOpen ? 'Hide design area' : 'Show design area'}
          </Button>
          <span className="ml-auto text-2xs text-ink-500">
            {currentUser.name} · {currentUser.role}
          </span>
        </div>

        {zonesOpen &&
        <BuilderZones
          definition={definition}
          zoneOf={zoneOf}
          onDropField={handleDropField}
          onRemoveColumn={removeColumn}
          onRemoveFilter={(id) =>
          setDefinition({
            ...definition,
            filters: definition.filters.filter((f) => f.id !== id)
          })
          }
          onClearGroup={() => setDefinition({ ...definition, groupBy: null })}
          onRemoveSort={(key) =>
          setDefinition({
            ...definition,
            sort: definition.sort.filter((s) => s.key !== key)
          })
          } />
        }
        

        <div className="min-h-0 flex-1">
          <ReportWorkspace
            definition={definition}
            onDefinitionChange={setDefinition}
            isTemplate={false}
            defaultPanelOpen
            emptyState={
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const fieldId = e.dataTransfer.getData('text/plain');
                if (fieldId) handleDropField(fieldId, 'rows');
              }}
              className="flex h-full items-center justify-center border-2 border-dashed border-line bg-surface-muted/50 m-3">
              
                <EmptyState
                icon={<MousePointerClickIcon className="h-5 w-5" />}
                title="Start building your report"
                description="Drop fields here, or drag them into Rows, Columns and Values above. Expand a table on the left and drag its fields in: Rows become the row labels, Columns are spread across the top, and Values are summed in the cells. A report reads one table at a time." />
              
              </div>
            } />
          
        </div>
      </div>

      <CalculatedFieldDialog
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        onCreate={(column, calculated) => {
          setState((prev) => ({
            definition: {
              ...prev.definition,
              columns: [...prev.definition.columns, column],
              calculatedFields: [...(prev.definition.calculatedFields ?? []), calculated]
            },
            zoneOf: { ...prev.zoneOf, [column.id]: 'values' }
          }));
          logAction(`Created calculated field "${column.label}"`, definition.name);
          toast.success(`Calculated field “${column.label}” added`);
        }} />
      
    </div>);

}