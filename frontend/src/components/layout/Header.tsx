import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BellIcon, LogOutIcon, SettingsIcon, UserIcon } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { useApp } from '../../contexts/AppContext';
import type { UserRole } from '../../types/erp';
import { selectClass } from '../../utils/ui';
const notifications = [{
  id: 'n1',
  title: 'Open Invoices delivered',
  detail: 'Daily 07:00 schedule · Excel',
  time: '2h ago'
}, {
  id: 'n2',
  title: 'Schema refresh completed',
  detail: '17 tables · 96 fields catalogued',
  time: '5h ago'
}, {
  id: 'n3',
  title: 'Report shared with you',
  detail: 'Fredrick R. shared “Management View”',
  time: 'Yesterday'
}];
export function Header() {
  const {
    currentUser,
    setRole,
    signOut
  } = useApp();
  const [openMenu, setOpenMenu] = useState<'bell' | 'user' | 'help' | null>(null);
  const navigate = useNavigate();
  const toggle = (menu: 'bell' | 'user' | 'help') => setOpenMenu((prev) => prev === menu ? null : menu);
  return <header className="relative z-40 flex h-12 shrink-0 items-center gap-4 border-b border-navy-950 bg-navy-900 px-3">
      <Link to="/" className="flex shrink-0 items-center gap-2.5">
        <span className="flex h-8 items-center rounded bg-white px-1.5 shadow-sm">
          <img src="/polydime-logo.png" alt="Polydime Plastics" className="h-6 w-auto" draggable={false} />
        </span>
        <span className="leading-tight">
          <span className="block text-[13px] font-semibold text-white">ERP Report Studio</span>
          <span className="block text-2xs text-slate-400">Polydime International</span>
        </span>
      </Link>

      <div className="flex flex-1 justify-center">
        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <div className="relative">
          <button type="button" onClick={() => toggle('bell')} aria-label="Notifications" className="relative rounded p-1.5 text-slate-300 transition-colors duration-150 hover:bg-navy-800 hover:text-white">
            <BellIcon className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
          </button>
          {openMenu === 'bell' && <div className="absolute right-0 top-10 w-80 rounded border border-line bg-white shadow-pop">
              <p className="border-b border-line bg-surface-muted px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                Notifications
              </p>
              <ul className="divide-y divide-line">
                {notifications.map((n) => <li key={n.id} className="px-3 py-2">
                    <p className="text-[13px] font-medium text-ink-900">{n.title}</p>
                    <p className="text-xs text-ink-500">{n.detail}</p>
                    <p className="mt-0.5 text-2xs text-ink-400">{n.time}</p>
                  </li>)}
              </ul>
            </div>}
        </div>

        <div className="relative">
          <button type="button" onClick={() => toggle('help')} aria-label="Help" className="rounded p-1.5 text-slate-300 transition-colors duration-150 hover:bg-navy-800 hover:text-white">
            <div className="h-4 w-4" />
          </button>
          {openMenu === 'help' && <div className="absolute right-0 top-10 w-72 rounded border border-line bg-white p-3 shadow-pop">
              <p className="text-[13px] font-semibold text-ink-900">Building a report</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-ink-700">
                <li>Open Report Builder and pick a template or start blank.</li>
                <li>Expand an ERP table and drag fields onto the canvas.</li>
                <li>Group, filter, total and format from the right panel.</li>
                <li>Save the report, then export or schedule it.</li>
              </ol>
              <p className="mt-2 border-t border-line pt-2 text-2xs text-ink-500">
                No SQL knowledge required — the studio generates the query for you.
              </p>
            </div>}
        </div>

        <button type="button" onClick={() => navigate('/settings')} aria-label="Settings" className="rounded p-1.5 text-slate-300 transition-colors duration-150 hover:bg-navy-800 hover:text-white">
          <SettingsIcon className="h-4 w-4" />
        </button>

        <div className="relative ml-1">
          <button type="button" onClick={() => toggle('user')} className="flex items-center gap-2 rounded px-1.5 py-1 text-left transition-colors duration-150 hover:bg-navy-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 text-2xs font-semibold text-white">
              {currentUser.initials}
            </span>
            <span className="hidden leading-tight lg:block">
              <span className="block text-xs font-medium text-white">
                {currentUser.name}
              </span>
              <span className="block text-2xs text-slate-400">{currentUser.role}</span>
            </span>
          </button>
          {openMenu === 'user' && <div className="absolute right-0 top-10 w-64 rounded border border-line bg-white p-3 shadow-pop">
              <p className="text-[13px] font-semibold text-ink-900">{currentUser.name}</p>
              <p className="text-xs text-ink-500">{currentUser.email}</p>
              <label className="mt-3 block text-2xs font-semibold uppercase tracking-wide text-ink-500">
                Active role
              </label>
              <select className={`${selectClass} mt-1`} value={currentUser.role} onChange={(e) => setRole(e.target.value as UserRole)}>
                <option>Administrator</option>
                <option>Report Designer</option>
                <option>Report Viewer</option>
              </select>
              <div className="mt-3 flex flex-col gap-1 border-t border-line pt-2">
                <button type="button" onClick={() => {
              setOpenMenu(null);
              navigate('/settings');
            }} className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-ink-700 transition-colors duration-150 hover:bg-surface-muted">
                  <UserIcon className="h-3.5 w-3.5" /> Report settings
                </button>
                <button type="button" onClick={signOut} className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-ink-700 transition-colors duration-150 hover:bg-surface-muted">
                  <LogOutIcon className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </div>}
        </div>
      </div>
    </header>;
}