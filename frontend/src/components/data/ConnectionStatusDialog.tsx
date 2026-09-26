import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useErpConnection } from '../../contexts/ErpConnectionContext';
import { architectureLayers } from '../../services/erpApi';
import { formatDateTime } from '../../utils/format';

export function ConnectionStatusDialog({
  open,
  onClose



}: {open: boolean;onClose: () => void;}) {
  const { activeSource, schemaStats, totalRecords, nextScheduledRefresh } =
  useErpConnection();
  const navigate = useNavigate();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Database connection status"
      description="Live status reported by the secure backend API."
      footer={
      <>
          <Button onClick={onClose}>Close</Button>
          <Button
          onClick={() => {
            onClose();
            navigate('/data-refresh');
          }}>
          
            Data refresh
          </Button>
          <Button
          variant="primary"
          onClick={() => {
            onClose();
            navigate('/data-sources');
          }}>
          
            Open data source
          </Button>
        </>
      }>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          <p className="text-[13px] font-semibold text-emerald-800">
            {activeSource.name} · {activeSource.status}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]">
          <div>
            <dt className="text-2xs uppercase tracking-wide text-ink-500">Database type</dt>
            <dd className="text-ink-900">{activeSource.databaseType}</dd>
          </div>
          <div>
            <dt className="text-2xs uppercase tracking-wide text-ink-500">Server</dt>
            <dd className="font-mono text-xs text-ink-900">
              {activeSource.server}:{activeSource.port}
            </dd>
          </div>
          <div>
            <dt className="text-2xs uppercase tracking-wide text-ink-500">Database</dt>
            <dd className="font-mono text-xs text-ink-900">{activeSource.database}</dd>
          </div>
          <div>
            <dt className="text-2xs uppercase tracking-wide text-ink-500">Authentication</dt>
            <dd className="text-ink-900">{activeSource.authMethod}</dd>
          </div>
          <div>
            <dt className="text-2xs uppercase tracking-wide text-ink-500">
              Last schema refresh
            </dt>
            <dd className="tabular text-ink-900">
              {formatDateTime(activeSource.lastSchemaRefresh)}
            </dd>
          </div>
          <div>
            <dt className="text-2xs uppercase tracking-wide text-ink-500">
              Last data refresh
            </dt>
            <dd className="tabular text-ink-900">
              {formatDateTime(activeSource.lastDataRefresh)}
            </dd>
          </div>
          <div>
            <dt className="text-2xs uppercase tracking-wide text-ink-500">Catalogue</dt>
            <dd className="tabular text-ink-900">
              {schemaStats.tables} tables · {schemaStats.fields} fields ·{' '}
              {schemaStats.relationships} relationships
            </dd>
          </div>
          <div>
            <dt className="text-2xs uppercase tracking-wide text-ink-500">Total records</dt>
            <dd className="tabular text-ink-900">{totalRecords.toLocaleString()}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-2xs uppercase tracking-wide text-ink-500">
              Next scheduled refresh
            </dt>
            <dd className="tabular text-ink-900">{nextScheduledRefresh}</dd>
          </div>
        </dl>

        <div className="rounded border border-line bg-surface-muted px-3 py-2">
          <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-500">
            Request path
          </p>
          <p className="text-2xs leading-relaxed text-ink-700">
            {architectureLayers.map((l) => l.label).reverse().join('  →  ')}
          </p>
        </div>
      </div>
    </Modal>);

}