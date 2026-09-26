import { CheckIcon, MinusIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/Panel';
import { permissionMatrix, roleSummaries } from '../../data/adminData';
import type { UserRole } from '../../types/erp';

const roles: UserRole[] = ['Administrator', 'Report Designer', 'Report Viewer'];

export function RolesPermissions() {
  return (
    <div className="pb-8">
      <PageHeader
        title="Roles & Permissions"
        breadcrumb={['Administration']}
        subtitle="Three roles govern what a user can do in the studio. Report data access always follows the ERP's own company and branch rights." />
      

      <div className="grid gap-3 px-5 py-4 md:grid-cols-3">
        {roleSummaries.map((role) =>
        <article
          key={role.role}
          className="rounded border border-line bg-white p-3 shadow-panel">
          
            <h2 className="text-[13px] font-semibold text-ink-900">{role.role}</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{role.description}</p>
            <p className="tabular mt-2 text-lg font-semibold text-ink-900">
              {role.members}
              <span className="ml-1 text-2xs font-normal uppercase tracking-wide text-ink-500">
                members
              </span>
            </p>
          </article>
        )}
      </div>

      <div className="px-5">
        <Panel title="Permission matrix">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-muted text-left text-2xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-3 py-1.5 font-semibold">Capability</th>
                {roles.map((role) =>
                <th key={role} scope="col" className="px-3 py-1.5 text-center font-semibold">
                    {role}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row) =>
              <tr
                key={row.capability}
                className="border-b border-line/70 text-[13px] hover:bg-accent-50/40">
                
                  <td className="px-3 py-1.5 text-ink-700">{row.capability}</td>
                  {roles.map((role) =>
                <td key={role} className="px-3 py-1.5 text-center">
                      {row[role] ?
                  <CheckIcon
                    className="mx-auto h-4 w-4 text-emerald-600"
                    aria-label="Allowed" /> :


                  <MinusIcon
                    className="mx-auto h-4 w-4 text-ink-400"
                    aria-label="Not allowed" />

                  }
                    </td>
                )}
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>);

}