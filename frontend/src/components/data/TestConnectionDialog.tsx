import { useCallback, useEffect, useState } from 'react';
import { AlertTriangleIcon, CheckCircle2Icon, ShieldCheckIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StepList } from './StepList';
import {
  API_BASE,
  connectionSteps,
  testConnection,
  type ProgressStep,
  type StepStatus,
  type TestConnectionResult } from
'../../services/erpApi';
import type { DataSourceConnection } from '../../types/erp';

interface TestConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  source: Pick<
    DataSourceConnection,
    'id' | 'name' | 'server' | 'database' | 'authMethod' | 'databaseType' | 'port'>;

  failAtStep?: string;
  onResult?: (result: TestConnectionResult) => void;
}

export function TestConnectionDialog({
  open,
  onClose,
  source,
  failAtStep,
  onResult
}: TestConnectionDialogProps) {
  const [steps, setSteps] = useState<ProgressStep[]>(connectionSteps);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestConnectionResult | null>(null);

  const run = useCallback(async () => {
    setSteps(connectionSteps.map((s) => ({ ...s, status: 'pending', detail: undefined })));
    setResult(null);
    setRunning(true);
    let outcome: TestConnectionResult;
    try {
      outcome = await testConnection(
        source,
        (stepId: string, status: StepStatus, detail?: string) =>
        setSteps((prev) =>
        prev.map((s) => s.id === stepId ? { ...s, status, detail } : s)
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSteps((prev) => prev.map((s) => s.status === 'running' || s.status === 'pending' ? { ...s, status: 'failed', detail: message } : s));
      outcome = { success: false, message, latencyMs: 0 };
    } finally {
      setRunning(false);
    }
    setResult(outcome);
    onResult?.(outcome);
  }, [source, failAtStep, onResult]);

  useEffect(() => {
    if (open) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Test connection"
      description={`${source.name} · ${source.databaseType} · ${source.server}:${source.port}`}
      footer={
      <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" disabled={running} onClick={() => void run()}>
            {running ? 'Testing…' : 'Run test again'}
          </Button>
        </>
      }>
      
      <div className="space-y-3">
        <p className="flex items-center gap-1.5 rounded border border-line bg-surface-muted px-2.5 py-1.5 font-mono text-2xs text-ink-500">
          <ShieldCheckIcon className="h-3.5 w-3.5 text-accent-600" />
          POST {API_BASE}/datasources/{'{id}'}/test — credentials resolved in the backend vault
        </p>

        <StepList steps={steps} />

        {result &&
        <div
          className={
          result.success ?
          'flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2' :
          'flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2'
          }
          role="status">
          
            {result.success ?
          <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> :

          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          }
            <div>
              <p
              className={
              result.success ?
              'text-[13px] font-semibold text-emerald-800' :
              'text-[13px] font-semibold text-red-800'
              }>
              
                {result.success ? 'Connection successful.' : 'Connection failed.'}
              </p>
              <p
              className={
              result.success ? 'text-xs text-emerald-700' : 'text-xs text-red-700'
              }>
              
                {result.message}
                {result.success && ` Round trip ${result.latencyMs} ms.`}
              </p>
              {!result.success &&
            <p className="mt-1 text-2xs text-red-700">
                  The reporting service account and secret are managed by IT in the backend
                  vault — no credential can be changed from this screen.
                </p>
            }
            </div>
          </div>
        }
      </div>
    </Modal>);

}