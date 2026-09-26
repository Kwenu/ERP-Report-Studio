import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, FilePlus2Icon, LayersIcon, LockIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { fixedTemplates } from '../data/templates';
import { formatDate } from '../utils/format';

const workflow = [
'Select an ERP table',
'Expand and pick fields',
'Drag fields into the report',
'Apply filters',
'Group the data',
'Configure totals',
'Format columns',
'Preview, save and export'];


export function ReportBuilder() {
  const navigate = useNavigate();

  return (
    <div className="pb-8">
      <PageHeader
        title="Report Builder"
        subtitle="Begin from one of the protected ERP templates, or start with a completely blank canvas." />
      

      <div className="grid gap-4 px-5 py-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel
            title={
            <span className="flex items-center gap-1.5">
                <LayersIcon className="h-4 w-4 text-accent-600" /> Start from Template
              </span>
            }
            bodyClassName="divide-y divide-line">
            
            {fixedTemplates.map((template) =>
            <div
              key={template.id}
              className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-accent-50/40">
              
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[13px] font-semibold text-ink-900">
                      {template.name}
                    </h3>
                    <Badge tone="navy">
                      <LockIcon className="mr-1 h-2.5 w-2.5" /> Protected
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {template.columns.length} columns ·{' '}
                    {template.groupBy === 'rep' ? 'grouped by rep' : 'grouped by customer'} ·{' '}
                    {template.dateFrom ?
                  `${formatDate(template.dateFrom)} – ${formatDate(template.dateTo!)}` :
                  'as of today'}
                  </p>
                </div>
                <Button onClick={() => navigate(`/reports/fixed/${template.id}`)}>
                  Open original
                </Button>
                <Button
                variant="primary"
                icon={<ArrowRightIcon className="h-3.5 w-3.5" />}
                onClick={() => navigate(`/builder/new?template=${template.id}`)}>
                
                  Build from this
                </Button>
              </div>
            )}
          </Panel>

          <Panel
            title={
            <span className="flex items-center gap-1.5">
                <FilePlus2Icon className="h-4 w-4 text-accent-600" /> Start Blank
              </span>
            }>
            
            <div className="flex items-center gap-6 px-4 py-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-semibold text-ink-900">
                  Create Blank Report
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  Open an empty canvas with the full ERP catalogue on the left. Drag any
                  field into Rows, Columns, Values, Filters, Group By or Sort By and the
                  studio assembles the query, joins and totals for you.
                </p>
              </div>
              <Button variant="primary" onClick={() => navigate('/builder/new')}>
                Start blank report
              </Button>
            </div>
          </Panel>
        </div>

        <Panel title="How it works">
          <ol className="divide-y divide-line">
            {workflow.map((step, i) =>
            <li key={step} className="flex items-center gap-2.5 px-3 py-2">
                <span className="tabular flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-2xs font-semibold text-ink-700">
                  {i + 1}
                </span>
                <span className="text-xs text-ink-700">{step}</span>
              </li>
            )}
          </ol>
          <p className="border-t border-line bg-surface-muted px-3 py-2 text-2xs leading-relaxed text-ink-500">
            The builder produces a structured report definition — column list, joins,
            filters, grouping and totals. Nobody writes SQL, and no database credentials
            ever reach the browser.
          </p>
        </Panel>
      </div>
    </div>);

}