import { useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { useApp } from '../../contexts/AppContext';
import { formatDate } from '../../utils/format';
import { inputClass, selectClass } from '../../utils/ui';

export function AuditLog() {
  const { audit } = useApp();
  const [query, setQuery] = useState('');
  const [user, setUser] = useState('All users');

  const usersInLog = ['All users', ...Array.from(new Set(audit.map((a) => a.user)))];

  const filtered = audit.filter(
    (entry) =>
    (user === 'All users' || entry.user === user) && (
    entry.action.toLowerCase().includes(query.toLowerCase()) ||
    entry.report.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="pb-8">
      <PageHeader
        title="Audit Log"
        breadcrumb={['Administration']}
        subtitle="Every report run, change, export and schema action is recorded." />
      

      <div className="px-5 py-4">
        <Panel
          title={`${filtered.length} events`}
          actions={
          <div className="flex items-center gap-2">
              <select
              className={`${selectClass} h-7 w-[160px] text-xs`}
              value={user}
              onChange={(e) => setUser(e.target.value)}
              aria-label="Filter by user">
              
                {usersInLog.map((u) =>
              <option key={u}>{u}</option>
              )}
              </select>
              <div className="relative w-64">
                <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                <input
                className={`${inputClass} h-7 pl-7 text-xs`}
                placeholder="Search actions and reports…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search audit log" />
              
              </div>
            </div>
          }>
          
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-muted text-left text-2xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-3 py-1.5 font-semibold">User</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Action</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Data Source</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Report</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Date / Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const date = new Date(entry.timestamp);
                return (
                  <tr
                    key={entry.id}
                    className="border-b border-line/70 text-[13px] hover:bg-accent-50/40">
                    
                    <td className="px-3 py-1.5 font-medium text-ink-900">{entry.user}</td>
                    <td className="px-3 py-1.5 text-ink-700">{entry.action}</td>
                    <td className="px-3 py-1.5 text-ink-500">{entry.dataSource ?? '—'}</td>
                    <td className="px-3 py-1.5 text-ink-700">{entry.report}</td>
                    <td className="tabular px-3 py-1.5 text-ink-500">
                      {formatDate(entry.timestamp.slice(0, 10))}{' '}
                      {date.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>);

              })}
              {filtered.length === 0 &&
              <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-xs text-ink-500">
                    No audit events match the current filters.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </Panel>
      </div>
    </div>);

}