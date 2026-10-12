import { useNavigate } from 'react-router-dom';
import { LockIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { arSummaryReport } from '../data/templates';
import { useApp } from '../contexts/AppContext';

/** "AR Reports" menu entry: the accounts-receivable report. Its customer detail report opens from a balance. */
export function ArReports() {
  const navigate = useNavigate();
  const { savedReports } = useApp();
  const template = arSummaryReport;
  const derived = savedReports.filter((r) => r.templateId === template.id);

  return (
    <div className="pb-8">
      <PageHeader
        title="AR Reports"
        breadcrumb={['Reports']}
        subtitle="Accounts receivable: what each customer owes, and every document behind it." />
      

      <div className="grid gap-3 px-5 py-4 xl:grid-cols-2">
        <article className="flex flex-col rounded border border-line bg-white shadow-panel">
          <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-ink-900">{template.name}</h2>
                <Badge tone="navy">
                  <LockIcon className="mr-1 h-2.5 w-2.5" /> Protected
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{template.description}</p>
            </div>
            <Button variant="primary" size="lg" onClick={() => navigate(`/reports/ar/${template.id}`)}>
              Open Report
            </Button>
          </header>

          <dl className="grid grid-cols-3 gap-3 bg-surface-muted px-4 py-2.5 text-xs">
            <div>
              <dt className="text-2xs uppercase tracking-wide text-ink-500">Columns</dt>
              <dd className="tabular font-medium text-ink-900">{template.columns.filter((c) => c.visible).length}</dd>
            </div>
            <div>
              <dt className="text-2xs uppercase tracking-wide text-ink-500">Balance from</dt>
              <dd className="font-medium text-ink-900">fDdbNote.TotBal</dd>
            </div>
            <div>
              <dt className="text-2xs uppercase tracking-wide text-ink-500">Drill-down</dt>
              <dd className="font-medium text-ink-900">Click a balance</dd>
            </div>
          </dl>

          {derived.length > 0 &&
          <footer className="border-t border-line px-4 py-2">
              <p className="text-2xs uppercase tracking-wide text-ink-500">Saved versions</p>
              <ul className="mt-1 space-y-0.5">
                {derived.map((report) =>
              <li key={report.id}>
                    <button
                  type="button"
                  onClick={() => navigate(`/reports/view/${report.id}`)}
                  className="text-xs text-accent-700 hover:underline">
                  
                      {report.name}
                    </button>
                    <span className="ml-2 text-2xs text-ink-500">{report.owner}</span>
                  </li>
              )}
              </ul>
            </footer>
          }
        </article>
      </div>
    </div>);

}
