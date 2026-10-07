import { useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { ReportList } from '../components/report/ReportList';
import { useApp } from '../contexts/AppContext';
import { fixedTemplates } from '../data/templates';

export function MyReports() {
  const { savedReports, currentUser } = useApp();
  const navigate = useNavigate();
  const mine = savedReports.filter((r) => r.owner === currentUser.name);
  const others = savedReports.filter((r) => r.owner !== currentUser.name);

  return (
    <div className="pb-8">
      <PageHeader
        title="My Reports"
        breadcrumb={['Reports']}
        subtitle="Reports you own, plus the protected templates available to everyone."
        actions={
        <Button
          variant="primary"
          size="lg"
          icon={<PlusIcon className="h-3.5 w-3.5" />}
          onClick={() => navigate('/builder/new')}>
          
            New custom report
          </Button>
        } />
      
      <div className="space-y-4 px-5 py-4">
        <ReportList
          reports={[...mine, ...others]}
          emptyTitle="No custom reports yet"
          emptyDescription="Build one from a template or start blank in the Report Builder." />
        
        <div>
          <h2 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">
            Fixed templates
          </h2>
          <ReportList
            reports={fixedTemplates}
            emptyTitle="No templates"
            emptyDescription="Templates are provisioned by the administrator." />
          
        </div>
      </div>
    </div>);

}