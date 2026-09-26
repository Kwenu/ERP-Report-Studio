import { useState } from 'react';
import { toast } from 'sonner';
import { SearchIcon, UserPlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { users as seedUsers } from '../../data/adminData';
import type { AppUser, UserRole } from '../../types/erp';
import { relativeTime } from '../../utils/format';
import { inputClass } from '../../utils/ui';

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>(seedUsers);
  const [query, setQuery] = useState('');

  const filtered = users.filter(
    (u) =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase()) ||
    u.department.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="pb-8">
      <PageHeader
        title="Users"
        breadcrumb={['Administration']}
        subtitle="Accounts with access to ERP Report Studio. Identity is managed by Polydime IT."
        actions={
        <Button
          variant="primary"
          icon={<UserPlusIcon className="h-3.5 w-3.5" />}
          onClick={() => toast.success('Invitation sent to the IT service desk queue')}>
          
            Invite user
          </Button>
        } />
      

      <div className="px-5 py-4">
        <Panel
          title="Directory"
          actions={
          <div className="relative w-64">
              <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
              className={`${inputClass} h-7 pl-7 text-xs`}
              placeholder="Search users…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search users" />
            
            </div>
          }>
          
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-muted text-left text-2xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-3 py-1.5 font-semibold">Name</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Email</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Department</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Role</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Status</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Last active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) =>
              <tr
                key={user.id}
                className="border-b border-line/70 text-[13px] hover:bg-accent-50/40">
                
                  <td className="px-3 py-1.5 font-medium text-ink-900">{user.name}</td>
                  <td className="px-3 py-1.5 text-ink-700">{user.email}</td>
                  <td className="px-3 py-1.5 text-ink-700">{user.department}</td>
                  <td className="px-3 py-1.5">
                    <select
                    aria-label={`Role for ${user.name}`}
                    className="h-7 rounded border border-line bg-white px-1.5 text-xs"
                    value={user.role}
                    onChange={(e) => {
                      const role = e.target.value as UserRole;
                      setUsers((prev) =>
                      prev.map((u) => u.id === user.id ? { ...u, role } : u)
                      );
                      toast.success(`${user.name} is now a ${role}`);
                    }}>
                    
                      <option>Administrator</option>
                      <option>Report Designer</option>
                      <option>Report Viewer</option>
                    </select>
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge
                    tone={
                    user.status === 'Active' ?
                    'green' :
                    user.status === 'Invited' ?
                    'blue' :
                    'neutral'
                    }>
                    
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-1.5 text-ink-500">
                    {relativeTime(user.lastActive)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>);

}