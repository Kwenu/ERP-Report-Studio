import { useNavigate } from 'react-router-dom';
import {
  DownloadIcon,
  LockIcon,
  PlusIcon,
  PrinterIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SaveIcon,
  SettingsIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { fixedTemplates } from '../data/templates';
import { formatDate } from '../utils/format';
import { useApp } from '../contexts/AppContext';

const secondaryActions = [
{ label: 'Customize', icon: <SettingsIcon className="h-3.5 w-3.5" /> },
{ label: 'Save As', icon: <SaveIcon className="h-3.5 w-3.5" /> },
{ label: 'Export', icon: <DownloadIcon className="h-3.5 w-3.5" /> },
{ label: 'Print', icon: <PrinterIcon className="h-3.5 w-3.5" /> },
{ label: 'Refresh', icon: <RefreshCwIcon className="h-3.5 w-3.5" /> },
{ label: 'Reset to Default', icon: <RotateCcwIcon className="h-3.5 w-3.5" /> },
{ label: 'Add Field', icon: <PlusIcon className="h-3.5 w-3.5" /> }];


export function FixedReports() {
  const navigate = useNavigate();
  const { savedReports } = useApp();

  return (
    <div className="pb-8">
      <PageHeader
        title="Fixed Reports"
        breadcrumb={['Reports']}
        subtitle="Protected ERP templates. The default structure is preserved — your changes are always saved as a separate version." />
      

      <div className="grid gap-3 px-5 py-4 xl:grid-cols-2">
        {fixedTemplates.map((template) => {
          const derived = savedReports.filter((r) => r.templateId === template.id);
          return (
            <article
              key={template.id}
              className="flex flex-col rounded border border-line bg-white shadow-panel">
              
              <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-ink-900">
                      {template.name}
                    </h2>
                    <Badge tone="navy">
                      <LockIcon className="mr-1 h-2.5 w-2.5" /> Protected
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">
                    {template.description}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate(`/reports/fixed/${template.id}`)}>
                  
                  Open Report
                </Button>
              </header>

              <dl className="grid grid-cols-3 gap-3 border-b border-line bg-surface-muted px-4 py-2.5 text-xs">
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-ink-500">Columns</dt>
                  <dd className="tabular font-medium text-ink-900">
                    {template.columns.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-ink-500">Grouped by</dt>
                  <dd className="font-medium text-ink-900">
                    {template.groupBy === 'rep' ? 'Sales Rep' : 'Customer'}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-ink-500">
                    Default period
                  </dt>
                  <dd className="font-medium text-ink-900">
                    {template.dateFrom ?
                    `${formatDate(template.dateFrom)} – ${formatDate(template.dateTo!)}` :
                    'As of today'}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2 px-4 py-3">
                {secondaryActions.map((action) =>
                <Button
                  key={action.label}
                  size="action"
                  icon={action.icon}
                  onClick={() => navigate(`/reports/fixed/${template.id}`)}>
                  
                    {action.label}
                  </Button>
                )}
              </div>

              {derived.length > 0 &&
              <footer className="border-t border-line px-4 py-2">
                  <p className="text-2xs uppercase tracking-wide text-ink-500">
                    Saved versions
                  </p>
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
            </article>);

        })}
      </div>
    </div>);

}