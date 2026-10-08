import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { LockIcon } from 'lucide-react';
import { ReportWorkspace } from '../components/report/ReportWorkspace';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { cloneDefinition, getTemplate } from '../data/templates';
import { useApp } from '../contexts/AppContext';
import type { ReportDefinition } from '../types/erp';

export function ReportView({ mode }: {mode: 'template' | 'saved';}) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { getReport, markViewed } = useApp();
  const id = mode === 'template' ? params.templateId : params.reportId;

  const source = useMemo(() => {
    if (!id) return undefined;
    return mode === 'template' ? getTemplate(id) : getReport(id);
  }, [id, mode, getReport]);

  const [definition, setDefinition] = useState<ReportDefinition | undefined>(() =>
  source ? cloneDefinition(source) : undefined
  );

  useEffect(() => {
    if (!source) {
      setDefinition(undefined);
      return;
    }
    const next = cloneDefinition(source);
    const customer = searchParams.get('customer');
    const invoice = searchParams.get('invoice');
    if (customer) {
      next.filters = [
      ...next.filters,
      {
        id: 'qp-customer',
        key: 'name',
        label: 'Name',
        dataType: 'text',
        operator: 'equals',
        value: customer,
        connector: 'AND'
      }];

    }
    if (invoice) {
      next.filters = [
      ...next.filters,
      {
        id: 'qp-invoice',
        key: 'num',
        label: 'Invoice Number',
        dataType: 'text',
        operator: 'equals',
        value: invoice,
        connector: 'AND'
      }];

    }
    setDefinition(next);
    markViewed(source.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.id, searchParams]);

  if (!definition) {
    return (
      <EmptyState
        className="h-full"
        icon={<LockIcon className="h-5 w-5" />}
        title="Report not found"
        description="This report may have been deleted or you may not have permission to view it."
        action={
        <Link to="/reports/fixed">
            <Button variant="primary">Back to Fixed Reports</Button>
          </Link>
        } />);


  }

  const isTemplate = mode === 'template';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        compact
        title={definition.name}
        breadcrumb={['Reports', isTemplate ? 'Fixed Reports' : 'My Reports']}
        subtitle={definition.description}
        actions={
        <div className="flex items-center gap-2">
            <Badge tone={isTemplate ? 'navy' : 'blue'}>
              {isTemplate && <LockIcon className="mr-1 h-2.5 w-2.5" />}
              {isTemplate ? 'Protected template' : definition.visibility}
            </Badge>
            <span className="text-2xs text-ink-500">Owner: {definition.owner}</span>
          </div>
        } />
      
      <div className="min-h-0 flex-1">
        <ReportWorkspace
          definition={definition}
          onDefinitionChange={setDefinition}
          isTemplate={isTemplate} />
        
      </div>
    </div>);

}