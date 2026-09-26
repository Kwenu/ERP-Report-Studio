import { CheckIcon, CircleIcon, Loader2Icon, XIcon } from 'lucide-react';
import type { ProgressStep } from '../../services/erpApi';
import { cx } from '../../utils/ui';

export function StepList({ steps }: {steps: ProgressStep[];}) {
  return (
    <ol className="divide-y divide-line rounded border border-line">
      {steps.map((step) =>
      <li key={step.id} className="flex items-start gap-2.5 px-3 py-2">
          <span className="mt-0.5 shrink-0">
            {step.status === 'passed' &&
          <CheckIcon className="h-4 w-4 text-emerald-600" aria-label="Passed" />
          }
            {step.status === 'failed' &&
          <XIcon className="h-4 w-4 text-red-600" aria-label="Failed" />
          }
            {step.status === 'running' &&
          <Loader2Icon className="h-4 w-4 animate-spin text-accent-600" aria-label="Running" />
          }
            {step.status === 'pending' &&
          <CircleIcon className="h-4 w-4 text-ink-400" aria-label="Pending" />
          }
          </span>
          <span className="min-w-0">
            <span
            className={cx(
              'block text-[13px]',
              step.status === 'pending' && 'text-ink-400',
              step.status === 'running' && 'text-ink-900',
              step.status === 'passed' && 'text-ink-900',
              step.status === 'failed' && 'font-medium text-red-700'
            )}>
            
              {step.status === 'running' || step.status === 'pending' ?
            step.runningLabel :
            step.label}
            </span>
            {step.detail &&
          <span
            className={cx(
              'block text-2xs',
              step.status === 'failed' ? 'text-red-600' : 'text-ink-500'
            )}>
            
                {step.detail}
              </span>
          }
          </span>
        </li>
      )}
    </ol>);

}