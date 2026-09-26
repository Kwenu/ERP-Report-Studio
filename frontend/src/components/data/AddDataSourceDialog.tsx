import { useState } from 'react';
import { LockIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import type { DataSourceConnection } from '../../types/erp';
import { inputClass, selectClass } from '../../utils/ui';
import { API_BASE } from '../../services/erpApi';

interface AddDataSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (source: DataSourceConnection) => void;
}

const databaseTypes = [
'SQL Server',
'PostgreSQL',
'MySQL',
'Oracle',
'IBM Db2'];


const defaultPorts: Record<string, string> = {
  'SQL Server': '1433',
  PostgreSQL: '5432',
  MySQL: '3306',
  Oracle: '1521',
  'IBM Db2': '50000'
};

export function AddDataSourceDialog({ open, onClose, onSave }: AddDataSourceDialogProps) {
  const [name, setName] = useState('ERP Reporting Replica');
  const [databaseType, setDatabaseType] = useState('SQL Server');
  const [server, setServer] = useState('ERP-SERVER-RO');
  const [port, setPort] = useState('1433');
  const [database, setDatabase] = useState('PolydimeERP_RO');
  const [authMethod, setAuthMethod] =
  useState<DataSourceConnection['authMethod']>('Windows Authentication');
  const [username, setUsername] = useState('POLYDIME\\svc_reporting');
  const [password, setPassword] = useState('');

  const windowsAuth = authMethod === 'Windows Authentication';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add data source"
      description="Connection details are posted to the secure backend, which stores the secret in its vault."
      width="max-w-2xl"
      footer={
      <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
          variant="primary"
          disabled={!name.trim() || !server.trim() || !database.trim()}
          onClick={() => {
            onSave({
              id: `ds-${Date.now()}`,
              name: name.trim(),
              databaseType,
              server: server.trim(),
              port,
              database: database.trim(),
              authMethod,
              username: windowsAuth ? username : username.trim(),
              status: 'Disconnected',
              lastSchemaRefresh: '',
              lastDataRefresh: '',
              isPrimary: false
            });
            onClose();
          }}>
          
            Save & test connection
          </Button>
        </>
      }>
      
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data source name" className="col-span-2">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)} />
          
        </Field>
        <Field label="Database type">
          <select
            className={selectClass}
            value={databaseType}
            onChange={(e) => {
              setDatabaseType(e.target.value);
              setPort(defaultPorts[e.target.value] ?? '');
            }}>
            
            {databaseTypes.map((t) =>
            <option key={t}>{t}</option>
            )}
          </select>
        </Field>
        <Field label="Port">
          <input
            className={inputClass}
            value={port}
            onChange={(e) => setPort(e.target.value)}
            inputMode="numeric" />
          
        </Field>
        <Field label="Server / host">
          <input
            className={inputClass}
            value={server}
            onChange={(e) => setServer(e.target.value)} />
          
        </Field>
        <Field label="Database name">
          <input
            className={inputClass}
            value={database}
            onChange={(e) => setDatabase(e.target.value)} />
          
        </Field>
        <Field label="Authentication method" className="col-span-2">
          <select
            className={selectClass}
            value={authMethod}
            onChange={(e) =>
            setAuthMethod(e.target.value as DataSourceConnection['authMethod'])
            }>
            
            <option>Windows Authentication</option>
            <option>Database Authentication</option>
          </select>
        </Field>
        <Field
          label="Username"
          hint={windowsAuth ? 'Service account managed by IT.' : undefined}>
          
          <input
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)} />
          
        </Field>
        <Field label="Password">
          <input
            type="password"
            className={inputClass}
            value={windowsAuth ? '' : password}
            disabled={windowsAuth}
            placeholder={windowsAuth ? 'Not required for Windows Authentication' : '••••••••'}
            onChange={(e) => setPassword(e.target.value)} />
          
        </Field>

        <p className="col-span-2 flex items-start gap-2 rounded border border-line bg-surface-muted px-3 py-2 text-2xs leading-relaxed text-ink-500">
          <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-600" />
          <span>
            The credential is submitted once to{' '}
            <span className="font-mono">POST {API_BASE}/datasources</span> over TLS and
            written to the backend secret store. It is never returned to the browser, never
            written to a report definition, and never appears in exports or the audit log.
            The browser never opens a database connection itself.
          </span>
        </p>
      </div>
    </Modal>);

}