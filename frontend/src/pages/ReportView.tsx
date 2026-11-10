import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, LockIcon } from 'lucide-react';
import { ReportWorkspace } from '../components/report/ReportWorkspace';
import { ArCustomerSwitcher } from '../components/report/ArCustomerSwitcher';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { cloneDefinition, getTemplate } from '../data/templates';
import { useApp } from '../contexts/AppContext';
import type { ReportDefinition } from '../types/erp';
import { IN_SEPARATOR } from '../utils/scope';

export function ReportView({ mode, section = 'fixed', templateId }: {mode: 'template' | 'saved';section?: 'fixed' | 'ar' | 'mfg' | 'inv';templateId?: string;}) {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getReport, markViewed } = useApp();
  const id = mode === 'template' ? templateId ?? params.templateId : params.reportId;

  const source = useMemo(() => {
    if (!id) return undefined;
    return mode === 'template' ? getTemplate(id) : getReport(id);
  }, [id, mode, getReport]);

  /** The "customer(s)" scope of the AR Customer Details report, as a filter the data query understands. */
  const customerScopeFilter = (codes: string[]): ReportDefinition['filters'][number] => ({
    id: 'qp-customer-id',
    key: 'customerId',
    label: 'Customer Code',
    dataType: 'text',
    operator: codes.length === 1 ? 'equals' : 'is one of',
    value: codes.join(IN_SEPARATOR),
    connector: 'AND'
  });

  /** The report as opened from the address (a clicked balance, ticked customers, an invoice link ...). */
  const buildDefinition = (from: ReportDefinition): ReportDefinition => {
    const next = cloneDefinition(from);
    const customer = searchParams.get('customer');
    const invoice = searchParams.get('invoice');
    // AR report: a clicked balance opens the details of that one customer (by customer code)
    // ...and several ticked balances / customers open ONE report with all their documents (?customerId=A&customerId=B)
    const customerIds = [...new Set(searchParams.getAll('customerId').map((c) => c.trim()).filter(Boolean))];
    const customerName = searchParams.get('customerName');
    if (customerIds.length > 0) {
      next.filters = [...next.filters, customerScopeFilter(customerIds)];

      next.subtitle =
      customerIds.length > 1 ?
      `${customerIds.length} customers` :
      customerName ? `${customerIds[0]} – ${customerName}` : customerIds[0];
    }
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
    return next;
  };

  // Built straight from the address, so the very first load already reads only the chosen customers.
  const [definition, setDefinition] = useState<ReportDefinition | undefined>(() =>
  source ? buildDefinition(source) : undefined
  );

  useEffect(() => {
    if (!source) {
      setDefinition(undefined);
      return;
    }
    setDefinition(buildDefinition(source));
    markViewed(source.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.id, searchParams]);

  /** Changes made on the report screen. "Clear all" / removing a chip never drops the customers chosen for the details report. */
  const handleDefinitionChange = (next: ReportDefinition) => {
    const codes = [...new Set(searchParams.getAll('customerId').map((c) => c.trim()).filter(Boolean))];
    const hasScope = next.filters.some((f) => f.key === 'customerId');
    setDefinition(next.id === 'ar-customer-detail' && codes.length > 0 && !hasScope ?
    { ...next, filters: [...next.filters, customerScopeFilter(codes)] } :
    next);
  };

  // The address already points to another report but the previous one is still held for a moment: show nothing
  // rather than the old report with the new report's data.
  if (source && definition && definition.id !== source.id) return null;

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageHeader
        compact
        title={definition.name}
        breadcrumb={['Reports', isTemplate ? section === 'ar' ? 'AR Reports' : section === 'mfg' ? 'Manufacturing Quick Report' : section === 'inv' ? 'Inventory Quick Report' : 'Fixed Reports' : 'Saved Reports']}
        subtitle={definition.id === 'ar-customer-detail' && definition.subtitle ? `${searchParams.getAll('customerId').length > 1 ? 'Customers' : 'Customer'}: ${definition.subtitle}` : definition.description}
        actions={
        <div className="flex items-center gap-2">
            {definition.id === 'ar-customer-detail' &&
            <Link to="/reports/ar/ar-report">
                <Button size="xs" icon={<ArrowLeftIcon className="h-3 w-3" />}>Back to AR Report</Button>
              </Link>
            }
            <Badge tone={isTemplate ? 'navy' : 'blue'}>
              {isTemplate && <LockIcon className="mr-1 h-2.5 w-2.5" />}
              {isTemplate ? 'Protected template' : definition.visibility}
            </Badge>
            <span className="text-2xs text-ink-500">Owner: {definition.owner}</span>
          </div>
        } />
      
      {definition.id === 'ar-customer-detail' &&
      <ArCustomerSwitcher
        customerIds={searchParams.getAll('customerId')}
        customerName={searchParams.get('customerName') ?? ''}
        onSelect={(codes) => {
          const next = new URLSearchParams();
          codes.forEach((code) => next.append('customerId', code));
          setSearchParams(next, { replace: true });
        }} />

      }
      <div className="min-h-0 flex-1 overflow-hidden">
        <ReportWorkspace
          key={definition.id}
          definition={definition}
          onDefinitionChange={handleDefinitionChange}
          isTemplate={isTemplate} />
        
      </div>
    </div>);

}