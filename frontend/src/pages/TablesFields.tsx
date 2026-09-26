import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DatabaseIcon, KeyIcon, LinkIcon, RefreshCwIcon, SearchIcon, TableIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { SchemaTree } from '../components/data/SchemaTree';
import { useErpConnection } from '../contexts/ErpConnectionContext';
import { allFields, erpTables } from '../data/schema';
import type { ErpField } from '../types/erp';
import { formatDateTime, relativeTime } from '../utils/format';
import { inputClass, selectClass, cx } from '../utils/ui';

export function TablesFields() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeSource, schemaStats } = useErpConnection();
  const navigate = useNavigate();
  const activeTable = searchParams.get('table') ?? erpTables[0].name;
  const [globalQuery, setGlobalQuery] = useState('');
  const [selectedField, setSelectedField] = useState<ErpField | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [format, setFormat] = useState('Currency');
  const [aggregation, setAggregation] = useState('Sum');
  const [decimals, setDecimals] = useState('2');

  const table = erpTables.find((t) => t.name === activeTable) ?? erpTables[0];

  const globalHits = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return allFields.
    filter(
      (f) => f.name.toLowerCase().includes(q) || f.displayName.toLowerCase().includes(q)
    ).
    slice(0, 40);
  }, [globalQuery]);

  const selectField = (field: ErpField) => {
    setSelectedField(field);
    setDisplayName(field.displayName);
    setFormat(
      field.dataType === 'currency' ?
      'Currency' :
      field.dataType === 'date' ?
      'Date' :
      field.dataType === 'decimal' || field.dataType === 'integer' ?
      'Number' :
      'Text'
    );
    setAggregation(
      field.dataType === 'currency' || field.dataType === 'decimal' ? 'Sum' : 'None'
    );
  };

  return (
    <div className="pb-8">
      <PageHeader
        title="Tables & Fields"
        breadcrumb={['Data Sources']}
        subtitle={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5 font-medium text-ink-900">
              <DatabaseIcon className="h-3.5 w-3.5 text-accent-600" />
              {activeSource.name}
            </span>
            <span>
              Schema discovered {formatDateTime(activeSource.lastSchemaRefresh)} ·{' '}
              {schemaStats.tables} tables · {schemaStats.fields} reportable fields ·{' '}
              {schemaStats.relationships} relationships
            </span>
          </span>
        }
        actions={
        <Button
          icon={<RefreshCwIcon className="h-3.5 w-3.5" />}
          onClick={() => navigate('/data-sources')}>
          
            Refresh Schema
          </Button>
        } />
      

      <div className="px-5 py-4">
        <Panel
          title="ERP data catalogue"
          actions={
          <div className="relative w-72">
              <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
              className={`${inputClass} h-7 pl-7 text-xs`}
              placeholder="Search all fields, e.g. customer"
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              aria-label="Search all fields" />
            
            </div>
          }>
          
          {globalQuery.trim().length >= 2 ?
          <div className="max-h-[420px] overflow-y-auto erp-scroll">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-surface-muted text-left text-2xs uppercase tracking-wide text-ink-500">
                    <th scope="col" className="px-3 py-1.5 font-semibold">Field</th>
                    <th scope="col" className="px-3 py-1.5 font-semibold">Display name</th>
                    <th scope="col" className="px-3 py-1.5 font-semibold">Source table</th>
                    <th scope="col" className="px-3 py-1.5 font-semibold">Data type</th>
                    <th scope="col" className="px-3 py-1.5 font-semibold">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {globalHits.map((field) =>
                <tr
                  key={field.id}
                  onClick={() => selectField(field)}
                  className="cursor-pointer border-b border-line/70 text-[13px] hover:bg-accent-50/50">
                  
                      <td className="px-3 py-1.5 font-mono text-xs text-ink-900">
                        {field.name}
                      </td>
                      <td className="px-3 py-1.5 text-ink-700">{field.displayName}</td>
                      <td className="px-3 py-1.5 text-ink-700">{field.table}</td>
                      <td className="px-3 py-1.5 text-ink-700">{field.dataType}</td>
                      <td className="px-3 py-1.5 tabular text-ink-500">{field.example}</td>
                    </tr>
                )}
                  {globalHits.length === 0 &&
                <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-xs text-ink-500">
                        No fields match “{globalQuery}”.
                      </td>
                    </tr>
                }
                </tbody>
              </table>
            </div> :

          <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-left text-2xs uppercase tracking-wide text-ink-500">
                  <th scope="col" className="px-3 py-1.5 font-semibold">Table Name</th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">Description</th>
                  <th scope="col" className="px-3 py-1.5 text-right font-semibold">Fields</th>
                  <th scope="col" className="px-3 py-1.5 text-right font-semibold">Records</th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">Last Updated</th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {erpTables.map((t) =>
              <tr
                key={t.name}
                onClick={() => setSearchParams({ table: t.name })}
                className={cx(
                  'cursor-pointer border-b border-line/70 text-[13px] transition-colors duration-150 hover:bg-accent-50/50',
                  t.name === activeTable && 'bg-accent-50'
                )}>
                
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-1.5 font-medium text-ink-900">
                        <TableIcon className="h-3.5 w-3.5 text-ink-400" />
                        {t.name}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-ink-700">{t.description}</td>
                    <td className="tabular px-3 py-1.5 text-right text-ink-700">
                      {t.fields.length}
                    </td>
                    <td className="tabular px-3 py-1.5 text-right text-ink-700">
                      {t.records.toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 text-ink-500">
                      {relativeTime(t.lastUpdated)}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge
                    tone={
                    t.status === 'Active' ?
                    'green' :
                    t.status === 'Syncing' ?
                    'blue' :
                    'amber'
                    }>
                    
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          }
        </Panel>
      </div>

      <div className="grid gap-4 px-5 xl:grid-cols-[268px_minmax(0,1fr)_320px]">
        <Panel title="Schema explorer" bodyClassName="flex flex-col">
          <SchemaTree
            activeTable={activeTable}
            onSelectTable={(name) => setSearchParams({ table: name })}
            onSelectField={(field) => {
              setSearchParams({ table: field.table });
              selectField(field);
            }}
            selectedFieldId={selectedField?.id} />
          
        </Panel>

        <Panel title={`${table.name} — fields`} bodyClassName="overflow-x-auto erp-scroll">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-muted text-left text-2xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-3 py-1.5 font-semibold">Field Name</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Key</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Display Name</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Data Type</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Description</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Example</th>
                <th scope="col" className="px-3 py-1.5 text-center font-semibold">Nullable</th>
                <th scope="col" className="px-3 py-1.5 text-center font-semibold">Reportable</th>
              </tr>
            </thead>
            <tbody>
              {table.fields.map((field) =>
              <tr
                key={field.id}
                onClick={() => selectField(field)}
                className={cx(
                  'cursor-pointer border-b border-line/70 text-[13px] transition-colors duration-150 hover:bg-accent-50/50',
                  selectedField?.id === field.id && 'bg-accent-50'
                )}>
                
                  <td className="px-3 py-1.5 font-mono text-xs text-ink-900">{field.name}</td>
                  <td className="px-3 py-1.5">
                    {field.isKey ?
                  <Badge tone="amber">
                        <KeyIcon className="mr-1 h-2.5 w-2.5" /> PK
                      </Badge> :
                  field.references ?
                  <Badge tone="blue" className="font-mono">
                        <LinkIcon className="mr-1 h-2.5 w-2.5" /> {field.references}
                      </Badge> :

                  <span className="text-2xs text-ink-400">—</span>
                  }
                  </td>
                  <td className="px-3 py-1.5 text-ink-700">{field.displayName}</td>
                  <td className="px-3 py-1.5 text-ink-700">{field.dataType}</td>
                  <td className="px-3 py-1.5 text-ink-500">{field.description}</td>
                  <td className="tabular px-3 py-1.5 text-ink-500">{field.example}</td>
                  <td className="px-3 py-1.5 text-center text-ink-500">
                    {field.nullable ? 'Yes' : 'No'}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <Badge tone={field.reportable ? 'green' : 'neutral'}>
                      {field.reportable ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title="Field configuration">
          {selectedField ?
          <div className="space-y-3 p-3">
              <Field label="Source field">
                <p className="rounded border border-line bg-surface-muted px-2 py-1.5 font-mono text-xs text-ink-700">
                  {selectedField.id}
                </p>
              </Field>
              <Field label="Display name">
                <input
                className={inputClass}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)} />
              
              </Field>
              <Field label="Data type">
                <input
                className={`${inputClass} bg-surface-muted`}
                value={selectedField.dataType}
                readOnly />
              
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Format">
                  <select
                  className={selectClass}
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}>
                  
                    <option>Text</option>
                    <option>Number</option>
                    <option>Currency</option>
                    <option>Percentage</option>
                    <option>Date</option>
                  </select>
                </Field>
                <Field label="Decimal places">
                  <select
                  className={selectClass}
                  value={decimals}
                  onChange={(e) => setDecimals(e.target.value)}>
                  
                    {['0', '1', '2', '3', '4'].map((n) =>
                  <option key={n}>{n}</option>
                  )}
                  </select>
                </Field>
                <Field label="Aggregation">
                  <select
                  className={selectClass}
                  value={aggregation}
                  onChange={(e) => setAggregation(e.target.value)}>
                  
                    <option>None</option>
                    <option>Sum</option>
                    <option>Average</option>
                    <option>Count</option>
                    <option>Minimum</option>
                    <option>Maximum</option>
                  </select>
                </Field>
                <Field label="Sort order">
                  <select className={selectClass} defaultValue="Ascending">
                    <option>Ascending</option>
                    <option>Descending</option>
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs text-ink-700">
                <input
                type="checkbox"
                defaultChecked={selectedField.reportable}
                className="h-3.5 w-3.5 accent-accent-500" />
              
                Available for reporting
              </label>
              <p className="rounded border border-line bg-surface-muted px-2.5 py-2 text-2xs leading-relaxed text-ink-500">
                Example output: <span className="tabular">{selectedField.example}</span> ·
                shown as “{displayName}” with {format.toLowerCase()} formatting
                {format === 'Currency' || format === 'Number' ? ` to ${decimals} dp` : ''}.
              </p>
            </div> :

          <p className="px-3 py-6 text-center text-xs text-ink-500">
              Select a field to configure how it appears in reports.
            </p>
          }
        </Panel>
      </div>
    </div>);

}