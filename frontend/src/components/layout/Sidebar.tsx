import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3Icon,
  ChevronDownIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ClockIcon,
  DatabaseIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  RefreshCwIcon,
  ShieldIcon,
  StarIcon,
  TableIcon,
  WrenchIcon } from
'lucide-react';
import { cx } from '../../utils/ui';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  children?: {label: string;to: string;}[];
}

const iconClass = 'h-4 w-4 shrink-0';

const navItems: NavItem[] = [
{ label: 'Dashboard', to: '/', icon: <LayoutDashboardIcon className={iconClass} /> },
{
  label: 'Reports',
  to: '/reports',
  icon: <FileTextIcon className={iconClass} />,
  children: [
  { label: 'Fixed Reports', to: '/reports/fixed' },
  { label: 'My Reports', to: '/reports/mine' },
  { label: 'Shared Reports', to: '/reports/shared' }]

},
{ label: 'Report Builder', to: '/builder', icon: <WrenchIcon className={iconClass} /> },
{ label: 'Data Sources', to: '/data-sources', icon: <DatabaseIcon className={iconClass} /> },
{ label: 'Data Refresh', to: '/data-refresh', icon: <RefreshCwIcon className={iconClass} /> },
{ label: 'Tables & Fields', to: '/tables', icon: <TableIcon className={iconClass} /> },
{ label: 'Data Model', to: '/data-model', icon: <BarChart3Icon className={iconClass} /> },
{ label: 'Favorites', to: '/favorites', icon: <StarIcon className={iconClass} /> },
{ label: 'Scheduled Reports', to: '/scheduled', icon: <ClockIcon className={iconClass} /> },
{
  label: 'Administration',
  to: '/admin',
  icon: <ShieldIcon className={iconClass} />,
  children: [
  { label: 'Users', to: '/admin/users' },
  { label: 'Roles & Permissions', to: '/admin/roles' },
  { label: 'Report Templates', to: '/admin/templates' },
  { label: 'Audit Log', to: '/admin/audit' }]

}];


export function Sidebar({
  collapsed,
  onToggle



}: {collapsed: boolean;onToggle: () => void;}) {
  const location = useLocation();
  const [open, setOpen] = useState<string[]>(['Reports']);

  const toggleSection = (label: string) =>
  setOpen((prev) =>
  prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
  );

  return (
    <nav
      aria-label="Primary"
      className={cx(
        'flex h-full shrink-0 flex-col border-r border-navy-950 bg-navy-900 text-slate-200 transition-[width] duration-200 ease-out',
        collapsed ? 'w-14' : 'w-56'
      )}>
      
      <div className="flex-1 overflow-y-auto erp-scroll py-2">
        {navItems.map((item) => {
          const sectionOpen = open.includes(item.label);
          const sectionActive = location.pathname.startsWith(item.to) && item.to !== '/';
          if (item.children) {
            return (
              <div key={item.label} className="px-2">
                <button
                  type="button"
                  onClick={() => collapsed ? onToggle() : toggleSection(item.label)}
                  aria-expanded={sectionOpen}
                  className={cx(
                    'mt-0.5 flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-[13px] transition-colors duration-150',
                    sectionActive ?
                    'bg-navy-700 text-white' :
                    'text-slate-300 hover:bg-navy-800 hover:text-white'
                  )}>
                  
                  {item.icon}
                  {!collapsed &&
                  <>
                      <span className="flex-1 truncate text-left">{item.label}</span>
                      <ChevronDownIcon
                      className={cx(
                        'h-3.5 w-3.5 transition-transform duration-150',
                        sectionOpen ? 'rotate-0' : '-rotate-90'
                      )} />
                    
                    </>
                  }
                </button>
                {!collapsed && sectionOpen &&
                <ul className="mb-1 ml-[26px] mt-0.5 border-l border-navy-700 pl-2">
                    {item.children.map((child) =>
                  <li key={child.to}>
                        <NavLink
                      to={child.to}
                      className={({ isActive }) =>
                      cx(
                        'block truncate rounded px-2 py-1 text-xs transition-colors duration-150',
                        isActive ?
                        'bg-accent-500 text-white' :
                        'text-slate-400 hover:bg-navy-800 hover:text-white'
                      )
                      }>
                      
                          {child.label}
                        </NavLink>
                      </li>
                  )}
                  </ul>
                }
              </div>);

          }
          return (
            <div key={item.label} className="px-2">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                cx(
                  'mt-0.5 flex items-center gap-2.5 rounded px-2 py-1.5 text-[13px] transition-colors duration-150',
                  isActive ?
                  'bg-accent-500 text-white' :
                  'text-slate-300 hover:bg-navy-800 hover:text-white'
                )
                }>
                
                {item.icon}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </div>);

        })}
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 border-t border-navy-800 px-4 py-2 text-2xs text-slate-400 transition-colors duration-150 hover:bg-navy-800 hover:text-white">
        
        {collapsed ?
        <ChevronsRightIcon className="h-4 w-4" /> :

        <>
            <ChevronsLeftIcon className="h-4 w-4" />
            Collapse
          </>
        }
      </button>
    </nav>);

}