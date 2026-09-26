import { Fragment, useState } from 'react';
import { ArrowDownIcon, KeyIcon, LinkIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { useErpConnection } from '../contexts/ErpConnectionContext';
import { erpTables, relationships } from '../data/schema';
import { formatDateTime } from '../utils/format';
import { cx } from '../utils/ui';

const chain = [
{ table: 'Customers', via: 'CustomerID' },
{ table: 'Invoices', via: 'InvoiceID' },
{ table: 'InvoiceLines', via: 'ItemID' },
{ table: 'Items', via: '' }];


const branches = [
{ from: 'Invoices', to: 'Employees', via: 'SalesRepID → EmployeeID' },
{ from: 'Invoices', to: 'Payments', via: 'InvoiceID → InvoiceID' }];


function TableCard({
  name,
  active,
  onClick




}: {name: string;active: boolean;onClick: () => void;}) {
  const table = erpTables.find((t) => t.name === name);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'w-56 rounded border bg-white text-left shadow-panel transition-colors duration-150',
        active ? 'border-accent-500 ring-1 ring-accent-300' : 'border-line hover:border-accent-300'
      )}>
      
      <p className="flex items-center justify-between border-b border-line bg-navy-900 px-2.5 py-1.5 text-xs font-semibold text-white">
        {name}
        <span className="font-normal text-slate-400">{table?.fields.length}</span>
      </p>
      <ul className="px-2.5 py-1.5">
        {table?.fields.slice(0, 5).map((field) =>
        <li
          key={field.id}
          className="flex items-center gap-1.5 py-[1px] text-2xs text-ink-700">
          
            {field.isKey && <KeyIcon className="h-2.5 w-2.5 text-amber-500" />}
            <span className={cx('truncate', field.isKey && 'font-medium text-ink-900')}>
              {field.name}
            </span>
            <span className="ml-auto shrink-0 text-[9px] uppercase text-ink-400">
              {field.dataType}
            </span>
          </li>
        )}
        {(table?.fields.length ?? 0) > 5 &&
        <li className="pt-0.5 text-[9px] uppercase tracking-wide text-ink-400">
            +{(table?.fields.length ?? 0) - 5} more fields
          </li>
        }
      </ul>
    </button>);

}

export function DataModel() {
  const { activeSource } = useErpConnection();
  const [active, setActive] = useState('Invoices');
  const activeRelationships = relationships.filter(
    (r) => r.fromTable === active || r.toTable === active
  );

  return (
    <div className="pb-8">
      <PageHeader
        title="Data Model"
        breadcrumb={['Data Sources']}
        subtitle={
        <span>
            Primary keys, foreign keys and relationships discovered from{' '}
            <span className="font-medium text-ink-900">{activeSource.name}</span> on{' '}
            {formatDateTime(activeSource.lastSchemaRefresh)}. The studio applies these join
            paths automatically — nobody writes SQL.
          </span>
        } />
      

      <div className="grid gap-4 px-5 py-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Relationship map" bodyClassName="overflow-x-auto erp-scroll">
          <div className="flex min-w-[720px] flex-col items-center gap-1 px-6 py-6">
            {chain.map((node, i) =>
            <Fragment key={node.table}>
                <div className="flex items-center gap-6">
                  {node.table === 'Invoices' &&
                <div className="flex flex-col items-end gap-1">
                      <TableCard
                    name="Employees"
                    active={active === 'Employees'}
                    onClick={() => setActive('Employees')} />
                  
                      <span className="pr-2 text-2xs text-ink-500">
                        SalesRepID → EmployeeID →
                      </span>
                    </div>
                }
                  <TableCard
                  name={node.table}
                  active={active === node.table}
                  onClick={() => setActive(node.table)} />
                
                  {node.table === 'Invoices' &&
                <div className="flex flex-col items-start gap-1">
                      <TableCard
                    name="Payments"
                    active={active === 'Payments'}
                    onClick={() => setActive('Payments')} />
                  
                      <span className="pl-2 text-2xs text-ink-500">
                        ← InvoiceID → InvoiceID
                      </span>
                    </div>
                }
                </div>
                {i < chain.length - 1 &&
              <div className="flex flex-col items-center py-1 text-ink-500">
                    <ArrowDownIcon className="h-4 w-4 text-accent-500" />
                    <span className="font-mono text-2xs">{node.via}</span>
                  </div>
              }
              </Fragment>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title={`Relationships for ${active}`}>
            <ul className="divide-y divide-line">
              {activeRelationships.map((rel) =>
              <li
                key={`${rel.fromTable}.${rel.fromField}-${rel.toTable}.${rel.toField}`}
                className="flex items-center gap-2 px-3 py-2 text-xs">
                
                  <LinkIcon className="h-3.5 w-3.5 shrink-0 text-accent-600" />
                  <span className="font-mono text-2xs text-ink-700">
                    {rel.fromTable}.{rel.fromField} → {rel.toTable}.{rel.toField}
                  </span>
                </li>
              )}
              {activeRelationships.length === 0 &&
              <li className="px-3 py-4 text-center text-xs text-ink-500">
                  This table has no defined relationships.
                </li>
              }
            </ul>
          </Panel>

          <Panel
            title={`Discovered relationships (${relationships.length})`}
            bodyClassName="max-h-[420px] overflow-y-auto erp-scroll">
            
            <table className="w-full">
              <thead>
                <tr className="sticky top-0 border-b border-line bg-surface-muted text-left text-2xs uppercase tracking-wide text-ink-500">
                  <th scope="col" className="px-3 py-1.5 font-semibold">Table</th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">Primary Key</th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">Foreign Key</th>
                  <th scope="col" className="px-3 py-1.5 font-semibold">Relationship</th>
                </tr>
              </thead>
              <tbody>
                {relationships.map((rel) =>
                <tr
                  key={`${rel.fromTable}-${rel.toTable}-${rel.fromField}-${rel.toField}`}
                  className={cx(
                    'border-b border-line/70 text-xs transition-colors duration-150 hover:bg-accent-50/40',
                    (rel.fromTable === active || rel.toTable === active) && 'bg-accent-50/60'
                  )}>
                  
                    <td className="px-3 py-1.5 font-medium text-ink-900">{rel.toTable}</td>
                    <td className="px-3 py-1.5 font-mono text-2xs text-ink-700">
                      {rel.fromTable}.{rel.fromField}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-2xs text-ink-700">
                      {rel.toTable}.{rel.toField}
                    </td>
                    <td className="px-3 py-1.5 text-ink-500">One → many</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Panel>

          <Panel title="Branch joins">
            <ul className="divide-y divide-line">
              {branches.map((b) =>
              <li key={b.to} className="px-3 py-2 text-xs text-ink-700">
                  <span className="font-medium text-ink-900">
                    {b.from} → {b.to}
                  </span>
                  <span className="ml-2 font-mono text-2xs text-ink-500">{b.via}</span>
                </li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </div>);

}