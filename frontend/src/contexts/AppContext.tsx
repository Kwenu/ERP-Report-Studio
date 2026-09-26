import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type {
  AuditEntry,
  ReportDefinition,
  ScheduledReport,
  UserRole } from
'../types/erp';
import { auditLog as seedAudit, scheduledReports as seedSchedules } from '../data/adminData';
import { cloneDefinition, fixedTemplates, makeColumn } from '../data/templates';

const seedCustomReports: ReportDefinition[] = [
{
  ...cloneDefinition(fixedTemplates[0]),
  id: 'custom-sales-analysis',
  name: 'Custom Sales Analysis',
  description: 'Substrate sales by representative for the April trading period.',
  category: 'Sales',
  type: 'Custom Report',
  templateId: 'sales-by-customer-detail',
  owner: 'Chamila Perera',
  createdBy: 'Chamila Perera',
  visibility: 'Shared with Department',
  groupBy: 'rep',
  lastModified: '2026-09-07T12:04:00Z',
  lastRun: '2026-09-08T07:10:00Z'
},
{
  ...cloneDefinition(fixedTemplates[3]),
  id: 'customer-outstanding',
  name: 'Customer Outstanding Report',
  description: 'Outstanding balances by customer with aging buckets for collections.',
  category: 'Receivables',
  type: 'Custom Report',
  templateId: 'open-invoices',
  owner: 'Dilani Gunawardena',
  createdBy: 'Dilani Gunawardena',
  visibility: 'Shared with Company',
  lastModified: '2026-09-05T09:22:00Z',
  lastRun: '2026-09-07T18:00:00Z'
},
{
  ...cloneDefinition(fixedTemplates[0]),
  id: 'sales-by-customer-management',
  name: 'Sales by Customer – Management View',
  description: 'Fixed template extended with sales representative and invoice status.',
  category: 'Management',
  type: 'Custom Report',
  templateId: 'sales-by-customer-detail',
  owner: 'Fredrick Rajapakse',
  createdBy: 'Fredrick Rajapakse',
  visibility: 'Shared with Company',
  columns: [
  ...cloneDefinition(fixedTemplates[0]).columns,
  makeColumn('SalesRepresentatives.RepCode', 'rep', 'Sales Representative', 'text', {
    width: 150
  }),
  makeColumn('Invoices.Status', 'status', 'Invoice Status', 'text', { width: 120 })],

  lastModified: '2026-09-07T10:48:00Z',
  lastRun: '2026-09-07T10:50:00Z'
}];


interface AppState {
  authenticated: boolean;
  signIn: (role: UserRole) => void;
  signOut: () => void;
  currentUser: {name: string;email: string;role: UserRole;initials: string;};
  setRole: (role: UserRole) => void;
  savedReports: ReportDefinition[];
  saveReport: (report: ReportDefinition) => void;
  deleteReport: (id: string) => void;
  duplicateReport: (id: string) => ReportDefinition | undefined;
  renameReport: (id: string, name: string) => void;
  getReport: (id: string) => ReportDefinition | undefined;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  recentlyViewed: string[];
  markViewed: (id: string) => void;
  audit: AuditEntry[];
  logAction: (action: string, report: string, dataSource?: string) => void;
  schedules: ScheduledReport[];
  addSchedule: (schedule: ScheduledReport) => void;
  toggleSchedule: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({
  children,
  initialAuthenticated = false



}: {children: React.ReactNode;initialAuthenticated?: boolean;}) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [role, setRole] = useState<UserRole>('Report Designer');
  const [savedReports, setSavedReports] = useState<ReportDefinition[]>(seedCustomReports);
  const [favorites, setFavorites] = useState<string[]>([
  'open-invoices',
  'custom-sales-analysis']
  );
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([
  'sales-by-customer-detail',
  'open-invoices',
  'average-days-to-pay']
  );
  const [audit, setAudit] = useState<AuditEntry[]>(seedAudit);
  const [schedules, setSchedules] = useState<ScheduledReport[]>(seedSchedules);

  const currentUser = useMemo(
    () => ({
      name: 'Chamila Perera',
      email: 'chamila.perera@polydime.lk',
      role,
      initials: 'CP'
    }),
    [role]
  );

  const logAction = useCallback(
    (action: string, report: string, dataSource = 'ERP Production Database') => {
      setAudit((prev) => [
      {
        id: `a-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        user: 'Chamila Perera',
        action,
        report,
        dataSource,
        timestamp: new Date().toISOString()
      },
      ...prev]
      );
    },
    []
  );

  const saveReport = useCallback((report: ReportDefinition) => {
    setSavedReports((prev) => {
      const exists = prev.some((r) => r.id === report.id);
      const next = { ...report, lastModified: new Date().toISOString() };
      return exists ? prev.map((r) => r.id === report.id ? next : r) : [next, ...prev];
    });
  }, []);

  const deleteReport = useCallback((id: string) => {
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const duplicateReport = useCallback(
    (id: string) => {
      const source = savedReports.find((r) => r.id === id);
      if (!source) return undefined;
      const copy: ReportDefinition = {
        ...cloneDefinition(source),
        id: `report-${Date.now()}`,
        name: `${source.name} (Copy)`,
        lastModified: new Date().toISOString()
      };
      setSavedReports((prev) => [copy, ...prev]);
      return copy;
    },
    [savedReports]
  );

  const renameReport = useCallback((id: string, name: string) => {
    setSavedReports((prev) =>
    prev.map((r) =>
    r.id === id ? { ...r, name, lastModified: new Date().toISOString() } : r
    )
    );
  }, []);

  const getReport = useCallback(
    (id: string) =>
    savedReports.find((r) => r.id === id) ?? fixedTemplates.find((t) => t.id === id),
    [savedReports]
  );

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) =>
    prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }, []);

  const markViewed = useCallback((id: string) => {
    setRecentlyViewed((prev) => [id, ...prev.filter((r) => r !== id)].slice(0, 8));
  }, []);

  const addSchedule = useCallback((schedule: ScheduledReport) => {
    setSchedules((prev) => [schedule, ...prev]);
  }, []);

  const toggleSchedule = useCallback((id: string) => {
    setSchedules((prev) =>
    prev.map((s) =>
    s.id === id ? { ...s, status: s.status === 'Active' ? 'Paused' : 'Active' } : s
    )
    );
  }, []);

  const value: AppState = {
    authenticated,
    signIn: (nextRole: UserRole) => {
      setRole(nextRole);
      setAuthenticated(true);
    },
    signOut: () => setAuthenticated(false),
    currentUser,
    setRole,
    savedReports,
    saveReport,
    deleteReport,
    duplicateReport,
    renameReport,
    getReport,
    favorites,
    toggleFavorite,
    recentlyViewed,
    markViewed,
    audit,
    logAction,
    schedules,
    addSchedule,
    toggleSchedule
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function canDesign(role: UserRole): boolean {
  return role === 'Administrator' || role === 'Report Designer';
}

export function isAdmin(role: UserRole): boolean {
  return role === 'Administrator';
}