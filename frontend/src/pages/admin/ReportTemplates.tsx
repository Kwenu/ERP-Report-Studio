import { useNavigate } from 'react-router-dom';
import { LockIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { fixedTemplates } from '../../data/templates';
import { useApp } from '../../contexts/AppContext';
import { formatDate } from '../../utils/format';

export function ReportTemplates() {
  const navigate = useNavigate();
  const { savedReports } = useApp();

  return (
    <div className="pb-8">
      <PageHeader
        title="Report Templates"
        breadcrumb={['Administration']}
        subtitle="Protected ERP templates. Users layer their own customisations on top; the default structure is never overwritten." />
      

      <div className="px-5 py-4">
        <Panel title="Fixed templates">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-muted text-left text-2xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-3 py-1.5 font-semibold">Template</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Category</th>
                <th scope="col" className="px-3 py-1.5 text-right font-semibold">Locked columns</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Default period</th>
                <th scope="col" className="px-3 py-1.5 text-right font-semibold">User versions</th>
                <th scope="col" className="px-3 py-1.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fixedTemplates.map((template) =>
              <tr key={template.id} className="border-b border-line/70 text-[13px]">
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-1.5 font-medium text-ink-900">
                      <LockIcon className="h-3 w-3 text-ink-400" />
                      {template.name}
                    </span>
                    <p className="text-2xs text-ink-500">{template.description}</p>
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge tone="neutral">{template.category}</Badge>
                  </td>
                  <td className="tabular px-3 py-1.5 text-right text-ink-700">
                    {template.columns.filter((c) => c.locked).length}
                  </td>
                  <td className="px-3 py-1.5 text-ink-700">
                    {template.dateFrom ?
                  `${formatDate(template.dateFrom)} – ${formatDate(template.dateTo!)}` :
                  'As of today'}
                  </td>
                  <td className="tabular px-3 py-1.5 text-right text-ink-700">
                    {savedReports.filter((r) => r.templateId === template.id).length}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Button
                    size="sm"
                    onClick={() => navigate(`/reports/fixed/${template.id}`)}>
                    
                      Open
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>);

}