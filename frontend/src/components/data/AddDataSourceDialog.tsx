import { useState } from 'react';
import { AlertTriangleIcon, LockIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import type { DataSourceConnection } from '../../types/erp';
import type { NewDataSource } from '../../services/erpApi';
import { inputClass, selectClass } from '../../utils/ui';
import { API_BASE } from '../../services/erpApi';

interface AddDataSourceDialogProps {
  open: boolean;
  onClose: () => void;
  /** Must save the source in the backend; rejects with a readable Error if it cannot. */
  onSave: (source: NewDataSource) => Promise<void>;
}

/** Catches typos such as "192.1681.215" before they turn into a long hang. */
function validateAddress(server: string, port: string): string | null {
  const host = server.trim();
  if (!host) return 'Enter the server name or IP address.';
  if (/\s/.test(host)) return 'The server name cannot contain spaces.';
  if (host.includes(':')) return 'Do not put the port in the server field — use the Port box.';
  if (/^[\d.]+$/.test(host)) {
    const parts = host.split('.');
    if (parts.length !== 4 || parts.some((p) => p === '' || Number(p) > 255)) {
      return `"${host}" is not a valid IPv4 address (four numbers from 0 to 255, e.g. 192.168.1.215).`;
    }
  }
  const n = Number(port);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return 'The port must be a number between 1 and 65535.';
  return null;
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
  const [name, setName] = useState('');
  const [databaseType, setDatabaseType] = useState('SQL Server');
  const [server, setServer] = useState('');
  const [port, setPort] = useState('1433');
  const [database, setDatabase] = useState('');
  const [authMethod, setAuthMethod] =
  useState<DataSourceConnection['authMethod']>('Database Authentication');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          disabled={saving || !name.trim() || !server.trim() || !database.trim() || windowsAuth}
          onClick={async () => {
            const problem = validateAddress(server, port);
            if (problem) {
              setError(problem);
              return;
            }
            setError(null);
            setSaving(true);
            try {
              await onSave({
                name: name.trim(),
                databaseType,
                server: server.trim(),
                port: port.trim(),
                database: database.trim(),
                authMethod,
                username: username.trim(),
                password
              });
              setPassword('');
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setSaving(false);
            }
          }}>
          
            {saving ? 'Saving…' : 'Save & test connection'}
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
            autoComplete="new-password"
            disabled={windowsAuth}
            placeholder={windowsAuth ? 'Not required for Windows Authentication' : '••••••••'}
            onChange={(e) => setPassword(e.target.value)} />
          
        </Field>

        {windowsAuth &&
        <p className="col-span-2 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-2xs text-amber-800">
            <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Windows Authentication is not supported by the backend's SQL Server driver. Create a
              read-only SQL login and choose "Database Authentication".
            </span>
          </p>
        }
        {error &&
        <p role="alert" className="col-span-2 flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        }

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