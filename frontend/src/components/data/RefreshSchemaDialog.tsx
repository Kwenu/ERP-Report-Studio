import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2Icon, DatabaseZapIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StepList } from './StepList';
import {
  API_BASE,
  refreshSchema,
  schemaSteps,
  type ProgressStep,
  type SchemaRefreshResult,
  type StepStatus } from
'../../services/erpApi';
import { formatDateTime } from '../../utils/format';

interface RefreshSchemaDialogProps {
  open: boolean;
  onClose: () => void;
  sourceId: string;
  sourceName: string;
  onComplete: (result: SchemaRefreshResult) => void;
}

export function RefreshSchemaDialog({
  open,
  onClose,
  sourceId,
  sourceName,
  onComplete
}: RefreshSchemaDialogProps) {
  const [steps, setSteps] = useState<ProgressStep[]>(schemaSteps);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SchemaRefreshResult | null>(null);

  const run = useCallback(async () => {
    setSteps(schemaSteps.map((s) => ({ ...s, status: 'pending', detail: undefined })));
    setResult(null);
    setRunning(true);
    const outcome = await refreshSchema(
      sourceId,
      (stepId: string, status: StepStatus, detail?: string) =>
      setSteps((prev) => prev.map((s) => s.id === stepId ? { ...s, status, detail } : s))
    );
    setRunning(false);
    setResult(outcome);
    onComplete(outcome);
  }, [sourceId, onComplete]);

  useEffect(() => {
    if (open) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const done = steps.filter((s) => s.status === 'passed').length;
  const percent = Math.round(done / steps.length * 100);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Refresh schema"
      description={`${sourceName} · metadata service`}
      footer={
      <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" disabled={running} onClick={() => void run()}>
            {running ? 'Discovering…' : 'Run again'}
          </Button>
        </>
      }>
      
      <div className="space-y-3">
        <p className="flex items-center gap-1.5 rounded border border-line bg-surface-muted px-2.5 py-1.5 font-mono text-2xs text-ink-500">
          <DatabaseZapIcon className="h-3.5 w-3.5 text-accent-600" />
          POST {API_BASE}/datasources/{'{id}'}/schema/refresh
        </p>

        <div>
          <div className="mb-1 flex items-center justify-between text-2xs text-ink-500">
            <span>{running ? 'Reading catalogue metadata…' : 'Discovery complete'}</span>
            <span className="tabular">{percent}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded bg-surface-sunken"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}>
            
            <div
              className="h-full bg-accent-500 transition-[width] duration-200 ease-out"
              style={{ width: `${percent}%` }} />
            
          </div>
        </div>

        <StepList steps={steps} />

        {result &&
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-800">
              <CheckCircle2Icon className="h-4 w-4" /> Schema refresh completed.
            </p>
            <dl className="mt-1.5 grid grid-cols-3 gap-2 text-xs text-emerald-800">
              <div>
                <dt className="text-2xs uppercase tracking-wide text-emerald-700">Tables</dt>
                <dd className="tabular font-semibold">{result.tables}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-emerald-700">Fields</dt>
                <dd className="tabular font-semibold">{result.fields}</dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-emerald-700">
                  Relationships
                </dt>
                <dd className="tabular font-semibold">{result.relationships}</dd>
              </div>
            </dl>
            <p className="mt-1.5 text-2xs text-emerald-700">
              Last schema refresh updated to {formatDateTime(result.completedAt)} ·{' '}
              {result.primaryKeys} primary keys, {result.foreignKeys} foreign keys.
            </p>
          </div>
        }
      </div>
    </Modal>);

}