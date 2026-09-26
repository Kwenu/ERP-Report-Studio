import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MousePointerClickIcon } from 'lucide-react';
import { FieldTree } from '../components/builder/FieldTree';
import { BuilderZones, type ZoneId } from '../components/builder/BuilderZones';
import { ReportWorkspace } from '../components/report/ReportWorkspace';
import { CalculatedFieldDialog } from '../components/builder/CalculatedFieldDialog';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { findField } from '../data/schema';
import {
  blankReport,
  cloneDefinition,
  columnFromField,
  getTemplate } from
'../data/templates';
import type { DatasetId, ErpField, ReportDefinition } from '../types/erp';
import { inputClass, selectClass } from '../utils/ui';
import { useApp } from '../contexts/AppContext';

const zoneOrder: ZoneId[] = ['rows', 'columns', 'values'];

const datasetOptions: {id: DatasetId;label: string;}[] = [
{ id: 'salesLines', label: 'Sales invoice detail (Invoices + InvoiceLines)' },
{ id: 'paymentTxns', label: 'Payment transactions (Invoices + Payments)' },
{ id: 'openInvoices', label: 'Open invoices as of today' }];


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
        zoneOf[c.id] = c.aggregation === 'none' ? 'columns' : 'values';
      });
      return { definition: copy, zoneOf };
    }
  }
  return { definition: blankReport(), zoneOf: {} };
}

export function BuilderCanvas() {
  const [searchParams] = useSearchParams();
  const { currentUser, logAction } = useApp();
  const [state, setState] = useState(() =>
  initialDefinition(searchParams.get('template'))
  );
  const [calcOpen, setCalcOpen] = useState(false);

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
    setState((prev) => {
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

      if (def.columns.some((c) => c.id === field.id)) return prev;
      const column = columnFromField(field);
      if (zone === 'values' && column.aggregation === 'none') column.aggregation = 'sum';
      if (zone !== 'values') column.aggregation = 'none';
      const zones2 = { ...zones, [field.id]: zone };
      return {
        definition: { ...def, columns: orderColumns([...def.columns, column], zones2) },
        zoneOf: zones2
      };
    });
  }, []);

  const handleDropField = (fieldId: string, zone: ZoneId) => {
    const field = findField(fieldId);
    if (!field) return;
    addFieldToZone(field, zone);
    toast.success(`${field.displayName} added to ${zone === 'groupBy' ? 'Group By' : zone}`);
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
        onFieldActivate={(field) => addFieldToZone(field, 'columns')}
        usedFieldIds={definition.columns.map((c) => c.id)} />
      

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2">
          <input
            aria-label="Report name"
            className={`${inputClass} h-8 w-64 font-medium`}
            value={definition.name}
            onChange={(e) => setDefinition({ ...definition, name: e.target.value })} />
          
          <select
            aria-label="Report data source"
            className={`${selectClass} w-[330px]`}
            value={definition.dataset}
            onChange={(e) =>
            setDefinition({ ...definition, dataset: e.target.value as DatasetId })
            }>
            
            {datasetOptions.map((option) =>
            <option key={option.id} value={option.id}>
                {option.label}
              </option>
            )}
          </select>
          <Button onClick={() => setCalcOpen(true)}>Calculated field</Button>
          <span className="ml-auto text-2xs text-ink-500">
            Designing as {currentUser.name} · {currentUser.role}
          </span>
        </div>

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
                if (fieldId) handleDropField(fieldId, 'columns');
              }}
              className="flex h-full items-center justify-center border-2 border-dashed border-line bg-surface-muted/50 m-3">
              
                <EmptyState
                icon={<MousePointerClickIcon className="h-5 w-5" />}
                title="Start building your report"
                description="Drop fields here, or drag them into Rows, Columns and Values above. Expand a table on the left — for example Invoices → InvoiceDate, InvoiceNumber, then InvoiceLines → Quantity and Amount." />
              
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