import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { selectClass, inputClass } from '../utils/ui';
import { useApp } from '../contexts/AppContext';

export function ReportSettings() {
  const { currentUser } = useApp();
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [numberFormat, setNumberFormat] = useState('1,234.56');
  const [decimals, setDecimals] = useState('2');
  const [density, setDensity] = useState('Compact');
  const [pageSize, setPageSize] = useState('50');
  const [exportFormat, setExportFormat] = useState('Excel');
  const [negativeStyle, setNegativeStyle] = useState('(1,234.56)');

  return (
    <div className="pb-8">
      <PageHeader
        title="Report Settings"
        subtitle="Defaults applied to every new report you open or build."
        actions={
        <Button variant="primary" onClick={() => toast.success('Settings saved')}>
            Save settings
          </Button>
        } />
      

      <div className="grid gap-4 px-5 py-4 xl:grid-cols-2">
        <Panel title="Display defaults">
          <div className="grid grid-cols-2 gap-3 p-3">
            <Field label="Date format">
              <select
                className={selectClass}
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}>
                
                <option>MM/DD/YYYY</option>
                <option>DD/MM/YYYY</option>
                <option>YYYY-MM-DD</option>
                <option>DD MMM YYYY</option>
              </select>
            </Field>
            <Field label="Number format">
              <select
                className={selectClass}
                value={numberFormat}
                onChange={(e) => setNumberFormat(e.target.value)}>
                
                <option>1,234.56</option>
                <option>1.234,56</option>
                <option>1 234.56</option>
              </select>
            </Field>
            <Field label="Default decimal places">
              <select
                className={selectClass}
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}>
                
                {['0', '1', '2', '3'].map((n) =>
                <option key={n}>{n}</option>
                )}
              </select>
            </Field>
            <Field label="Negative numbers">
              <select
                className={selectClass}
                value={negativeStyle}
                onChange={(e) => setNegativeStyle(e.target.value)}>
                
                <option>(1,234.56)</option>
                <option>-1,234.56</option>
              </select>
            </Field>
            <Field label="Row density">
              <select
                className={selectClass}
                value={density}
                onChange={(e) => setDensity(e.target.value)}>
                
                <option>Compact</option>
                <option>Normal</option>
                <option>Relaxed</option>
              </select>
            </Field>
            <Field label="Rows per page">
              <select
                className={selectClass}
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}>
                
                {['25', '50', '100', '250', '500'].map((n) =>
                <option key={n}>{n}</option>
                )}
              </select>
            </Field>
          </div>
        </Panel>

        <Panel title="Export & delivery">
          <div className="space-y-3 p-3">
            <Field label="Preferred export format">
              <select
                className={selectClass}
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}>
                
                <option>Excel</option>
                <option>CSV</option>
                <option>PDF</option>
              </select>
            </Field>
            <Field label="Reply-to address for scheduled reports">
              <input className={inputClass} defaultValue={currentUser.email} />
            </Field>
            {[
            'Include the report header (company, period, basis) in exports',
            'Preserve grouping and subtotals in Excel exports',
            'Repeat column headers on every printed page',
            'Email me when a scheduled run fails'].
            map((option) =>
            <label key={option} className="flex items-center gap-2 text-xs text-ink-700">
                <input
                type="checkbox"
                defaultChecked
                className="h-3.5 w-3.5 accent-accent-500" />
              
                {option}
              </label>
            )}
          </div>
        </Panel>

        <Panel title="Preview">
          <div className="p-4">
            <div className="rounded border border-line">
              <div className="border-b border-line bg-white px-3 py-2 text-center">
                <p className="text-xs font-semibold text-ink-900">Polydime</p>
                <p className="text-[13px] font-bold text-ink-900">Sales by Customer Detail</p>
                <p className="text-2xs text-ink-700">April 2023 · Report Basis: Accrual</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-sunken text-left text-2xs uppercase tracking-wide text-ink-500">
                    <th scope="col" className="px-2 py-1 font-semibold">Date</th>
                    <th scope="col" className="px-2 py-1 font-semibold">Num</th>
                    <th scope="col" className="px-2 py-1 text-right font-semibold">Qty</th>
                    <th scope="col" className="px-2 py-1 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="bg-surface-muted">
                    <td colSpan={4} className="px-2 py-1 font-semibold text-ink-900">
                      Biosmart LK (Pvt) Ltd
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-[3px] text-ink-700">04/09/2023</td>
                    <td className="px-2 py-[3px] text-ink-700">INV-24010</td>
                    <td className="tabular px-2 py-[3px] text-right text-ink-700">240</td>
                    <td className="tabular px-2 py-[3px] text-right text-ink-700">348,000.00</td>
                  </tr>
                  <tr className="bg-surface-muted font-semibold">
                    <td className="px-2 py-[3px] text-ink-900">Total Biosmart LK (Pvt) Ltd</td>
                    <td />
                    <td className="tabular px-2 py-[3px] text-right">240</td>
                    <td className="tabular px-2 py-[3px] text-right">348,000.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-2xs text-ink-500">
              Dates as {dateFormat}, numbers as {numberFormat} to {decimals} dp, negatives as{' '}
              {negativeStyle}, {density.toLowerCase()} rows, {pageSize} per page.
            </p>
          </div>
        </Panel>
      </div>
    </div>);

}