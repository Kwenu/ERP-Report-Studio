import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DatabaseIcon,
  PlusIcon,
  RefreshCwIcon,
  SettingsIcon,
  ShieldCheckIcon,
  PlugZapIcon,
  ServerIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Field } from '../components/ui/Field';
import { TestConnectionDialog } from '../components/data/TestConnectionDialog';
import { RefreshSchemaDialog } from '../components/data/RefreshSchemaDialog';
import { AddDataSourceDialog } from '../components/data/AddDataSourceDialog';
import { useErpConnection } from '../contexts/ErpConnectionContext';
import { useApp, isAdmin } from '../contexts/AppContext';
import { architectureLayers } from '../services/erpApi';
import type { DataSourceConnection } from '../types/erp';
import { formatDateTime } from '../utils/format';
import { inputClass, selectClass, cx } from '../utils/ui';

export function DataSources({ simulateConnectionFailure = false }: {simulateConnectionFailure?: boolean;}) {
  const {
    sources,
    activeSource,
    setActiveSourceId,
    addSource,
    setConnectionStatus,
    schemaStats,
    applySchemaRefresh,
    totalRecords
  } = useErpConnection();
  const { currentUser, logAction } = useApp();
  const navigate = useNavigate();

  const [testTarget, setTestTarget] = useState<DataSourceConnection | null>(null);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const admin = isAdmin(currentUser.role);

  return (
    <div className="pb-8">
      <PageHeader
        title="Data Sources"
        subtitle="Connections are brokered by the secure backend API. Credentials live in the backend vault — never in the browser."
        actions={
        <Button
          variant="primary"
          icon={<PlusIcon className="h-3.5 w-3.5" />}
          disabled={!admin}
          onClick={() => setAddOpen(true)}>
          
            Add Data Source
          </Button>
        } />
      

      <div className="grid gap-4 px-5 py-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {sources.map((source) => {
            const isActive = source.id === activeSource.id;
            return (
              <section
                key={source.id}
                className={cx(
                  'rounded border bg-white shadow-panel',
                  isActive ? 'border-accent-300' : 'border-line'
                )}>
                
                <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                      <DatabaseIcon className="h-4 w-4 text-accent-600" />
                      {source.name}
                      {source.isPrimary && <Badge tone="navy">Primary</Badge>}
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs">
                      <span
                        className={cx(
                          'inline-block h-2 w-2 rounded-full',
                          source.status === 'Connected' ?
                          'bg-emerald-500' :
                          source.status === 'Error' ?
                          'bg-red-500' :
                          'bg-ink-400'
                        )}
                        aria-hidden />
                      
                      <span
                        className={
                        source.status === 'Connected' ?
                        'font-medium text-emerald-700' :
                        'font-medium text-ink-700'
                        }>
                        
                        {source.status}
                      </span>
                      <span className="text-ink-500">
                        · {source.databaseType} · {source.authMethod}
                      </span>
                    </p>
                  </div>
                  {!isActive &&
                  <Button size="sm" onClick={() => setActiveSourceId(source.id)}>
                      Make active
                    </Button>
                  }
                </header>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3 text-[13px] md:grid-cols-3 xl:grid-cols-4">
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-ink-500">
                      Database Type
                    </dt>
                    <dd className="text-ink-900">{source.databaseType}</dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-ink-500">Server</dt>
                    <dd className="font-mono text-xs text-ink-900">
                      {source.server}:{source.port}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-ink-500">Database</dt>
                    <dd className="font-mono text-xs text-ink-900">{source.database}</dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-ink-500">
                      Service account
                    </dt>
                    <dd className="font-mono text-xs text-ink-900">{source.username}</dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-ink-500">
                      Last Schema Refresh
                    </dt>
                    <dd className="tabular text-ink-900">
                      {source.lastSchemaRefresh ?
                      formatDateTime(source.lastSchemaRefresh) :
                      'Never'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-ink-500">
                      Last Data Refresh
                    </dt>
                    <dd className="tabular text-ink-900">
                      {source.lastDataRefresh ?
                      formatDateTime(source.lastDataRefresh) :
                      'Never'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-ink-500">Tables</dt>
                    <dd className="tabular text-ink-900">
                      {isActive ? schemaStats.tables : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs uppercase tracking-wide text-ink-500">
                      Reportable Fields
                    </dt>
                    <dd className="tabular text-ink-900">
                      {isActive ? schemaStats.fields : '—'}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-surface-muted px-4 py-2.5">
                  <Button
                    size="sm"
                    icon={<PlugZapIcon className="h-3.5 w-3.5" />}
                    onClick={() => setTestTarget(source)}>
                    
                    Test Connection
                  </Button>
                  <Button
                    size="sm"
                    icon={<RefreshCwIcon className="h-3.5 w-3.5" />}
                    disabled={!admin || !isActive}
                    onClick={() => setSchemaOpen(true)}>
                    
                    Refresh Schema
                  </Button>
                  <Button
                    size="sm"
                    icon={<RefreshCwIcon className="h-3.5 w-3.5" />}
                    disabled={!isActive}
                    onClick={() => navigate('/data-refresh')}>
                    
                    Refresh Data
                  </Button>
                  <Button
                    size="sm"
                    icon={<SettingsIcon className="h-3.5 w-3.5" />}
                    onClick={() => setSettingsOpen(true)}>
                    
                    Settings
                  </Button>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Link to="/tables">
                      <Button size="sm">View Tables</Button>
                    </Link>
                    <Link to="/data-model">
                      <Button size="sm">Data Model</Button>
                    </Link>
                  </div>
                </div>
              </section>);

          })}

          <Panel title="Discovered schema">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3 text-[13px] md:grid-cols-5">
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">Tables</dt>
                <dd className="tabular text-lg font-semibold text-ink-900">
                  {schemaStats.tables}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">
                  Reportable fields
                </dt>
                <dd className="tabular text-lg font-semibold text-ink-900">
                  {schemaStats.fields}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">
                  Relationships
                </dt>
                <dd className="tabular text-lg font-semibold text-ink-900">
                  {schemaStats.relationships}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">Primary keys</dt>
                <dd className="tabular text-lg font-semibold text-ink-900">
                  {schemaStats.primaryKeys}
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-500">
                  Records indexed
                </dt>
                <dd className="tabular text-lg font-semibold text-ink-900">
                  {totalRecords.toLocaleString()}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title={
            <span className="flex items-center gap-1.5">
                <ServerIcon className="h-4 w-4 text-accent-600" /> Integration architecture
              </span>
            }>
            
            <ol className="px-4 py-3">
              {architectureLayers.map((layer, i, arr) =>
              <li key={layer.id}>
                  <div className="flex items-start gap-2.5">
                    <span className="tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-2xs font-semibold text-ink-700">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-ink-900">{layer.label}</p>
                      <p className="text-2xs text-ink-500">{layer.detail}</p>
                    </div>
                  </div>
                  {i < arr.length - 1 &&
                <div className="ml-[9px] h-3 border-l border-line" aria-hidden />
                }
                </li>
              )}
            </ol>
            <p className="border-t border-line bg-surface-muted px-4 py-2 text-2xs leading-relaxed text-ink-500">
              The studio calls the backend only. The browser never opens a database
              connection and never receives a connection string.
            </p>
          </Panel>

          <Panel
            title={
            <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="h-4 w-4 text-accent-600" /> Security
              </span>
            }>
            
            <ul className="space-y-2 px-4 py-3 text-xs leading-relaxed text-ink-700">
              <li>Credentials live only in the backend secret store.</li>
              <li>Report definitions are sent to the query engine as structured JSON.</li>
              <li>Row access follows the ERP user's existing company and branch rights.</li>
              <li>
                Only Administrators can add sources, refresh schema or change connection
                settings.
              </li>
              <li>Every test, refresh, run and export is written to the audit log.</li>
            </ul>
          </Panel>
        </div>
      </div>

      {testTarget &&
      <TestConnectionDialog
        open={Boolean(testTarget)}
        onClose={() => setTestTarget(null)}
        source={testTarget}
        failAtStep={simulateConnectionFailure ? 'auth' : undefined}
        onResult={(result) => {
          if (testTarget.id === activeSource.id)
          setConnectionStatus(result.success ? 'Connected' : 'Error');
          logAction(
            result.success ?
            'Database connection tested — successful' :
            'Database connection tested — failed',
            '—',
            testTarget.name
          );
        }} />

      }

      <RefreshSchemaDialog
        open={schemaOpen}
        onClose={() => setSchemaOpen(false)}
        sourceId={activeSource.id}
        sourceName={activeSource.name}
        onComplete={(result) => {
          applySchemaRefresh(result);
          logAction(
            `Schema refreshed — ${result.tables} tables, ${result.fields} fields, ${result.relationships} relationships`,
            '—',
            activeSource.name
          );
          toast.success('Schema refresh completed');
        }} />
      

      <AddDataSourceDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(source) => {
          addSource(source);
          logAction('Data source created', '—', source.name);
          toast.success(`${source.name} added — testing connection`);
          setTestTarget(source);
        }} />
      

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Connection settings"
        description={`${activeSource.name} · managed by the backend connector`}
        footer={
        <>
            <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button
            variant="primary"
            disabled={!admin}
            onClick={() => {
              setSettingsOpen(false);
              logAction('Connection settings updated', '—', activeSource.name);
              toast.success('Connection settings saved');
            }}>
            
              Save settings
            </Button>
          </>
        }>
        
        <div className="grid grid-cols-2 gap-3">
          <Field label="Display name" className="col-span-2">
            <input className={inputClass} defaultValue={activeSource.name} />
          </Field>
          <Field label="Query timeout (seconds)">
            <input className={inputClass} defaultValue="120" inputMode="numeric" />
          </Field>
          <Field label="Max connection pool">
            <input className={inputClass} defaultValue="25" inputMode="numeric" />
          </Field>
          <Field label="Read mode">
            <select className={selectClass} defaultValue="Read-only replica">
              <option>Read-only replica</option>
              <option>Primary (read committed)</option>
            </select>
          </Field>
          <Field label="Row limit per query">
            <select className={selectClass} defaultValue="500,000">
              <option>100,000</option>
              <option>500,000</option>
              <option>1,000,000</option>
            </select>
          </Field>
          <p className="col-span-2 rounded border border-line bg-surface-muted px-3 py-2 text-2xs leading-relaxed text-ink-500">
            Server, database and credentials can only be changed by IT in the backend
            configuration. This screen never displays or transmits a password.
          </p>
        </div>
      </Modal>
    </div>);

}