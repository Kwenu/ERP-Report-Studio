import { PageHeader } from '../components/ui/PageHeader';
import { ReportList } from '../components/report/ReportList';
import { useApp } from '../contexts/AppContext';
import { fixedTemplates } from '../data/templates';

export function SharedReports() {
  const { savedReports } = useApp();
  const shared = [
  ...fixedTemplates,
  ...savedReports.filter((r) => r.visibility !== 'Private')];


  return (
    <div className="pb-8">
      <PageHeader
        title="Shared Reports"
        breadcrumb={['Reports']}
        subtitle="Reports published to your department or the whole company. Viewers can filter and export but cannot change the saved definition." />
      
      <div className="px-5 py-4">
        <ReportList
          reports={shared}
          emptyTitle="Nothing shared with you yet"
          emptyDescription="When a colleague shares a report with your department it will appear here." />
        
      </div>
    </div>);

}