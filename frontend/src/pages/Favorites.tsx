import { PageHeader } from '../components/ui/PageHeader';
import { ReportList } from '../components/report/ReportList';
import { useApp } from '../contexts/AppContext';
import { fixedTemplates } from '../data/templates';

export function Favorites() {
  const { savedReports, favorites } = useApp();
  const all = [...fixedTemplates, ...savedReports];
  const starred = all.filter((r) => favorites.includes(r.id));

  return (
    <div className="pb-8">
      <PageHeader
        title="Favorites"
        subtitle="Quick access to the reports you star." />
      
      <div className="px-5 py-4">
        <ReportList
          reports={starred}
          emptyTitle="No favourites yet"
          emptyDescription="Star a report from any report list or from the report toolbar to pin it here." />
        
      </div>
    </div>);

}