import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const apply = () => setCollapsed(window.innerWidth < 1180);
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-surface-muted">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="min-w-0 flex-1 overflow-y-auto erp-scroll">
          <Outlet />
        </main>
      </div>
    </div>);

}