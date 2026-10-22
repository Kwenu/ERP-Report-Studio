import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider, useApp } from "./contexts/AppContext";
import { ErpConnectionProvider } from "./contexts/ErpConnectionContext";
import { AppShell } from "./components/layout/AppShell";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { FixedReports } from "./pages/FixedReports";
import { ReportView } from "./pages/ReportView";
import { ReportBuilder } from "./pages/ReportBuilder";
import { BuilderCanvas } from "./pages/BuilderCanvas";
import { DataSources } from "./pages/DataSources";
import { DataRefresh } from "./pages/DataRefresh";
import { SharedReports } from "./pages/SharedReports";
import { Favorites } from "./pages/Favorites";
import { ScheduledReports } from "./pages/ScheduledReports";
import { ReportSettings } from "./pages/ReportSettings";
import { UserManagement } from "./pages/admin/UserManagement";
import { RolesPermissions } from "./pages/admin/RolesPermissions";
import { ReportTemplates } from "./pages/admin/ReportTemplates";
import { AuditLog } from "./pages/admin/AuditLog";

function StudioRoutes({
  simulateConnectionFailure,
}: {
  simulateConnectionFailure: boolean;
}) {
  const { authenticated, restoringSession } = useApp();

  if (restoringSession)
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-500">
        Restoring your session…
      </div>
    );
  if (!authenticated) return <Login />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/reports"
          element={<Navigate to="/reports/fixed" replace />}
        />
        <Route path="/reports/fixed" element={<FixedReports />} />
        <Route
          path="/reports/fixed/:templateId"
          element={<ReportView mode="template" />}
        />

        <Route
          path="/reports/ar"
          element={
            <ReportView mode="template" section="ar" templateId="ar-report" />
          }
        />

        <Route
          path="/reports/ar/:templateId"
          element={<ReportView mode="template" section="ar" />}
        />

        <Route
          path="/reports/view/:reportId"
          element={<ReportView mode="saved" />}
        />
        <Route
          path="/reports/manufacturing"
          element={
            <ReportView
              key="manufacturing"
              mode="template"
              section="mfg"
              templateId="manufacturing-quick-report"
            />
          }
        />

        <Route
          path="/reports/inventory"
          element={
            <ReportView
              key="inventory"
              mode="template"
              section="inv"
              templateId="inventory-quick-report"
            />
          }
        />

        <Route
          path="/reports/mine"
          element={<Navigate to="/reports/shared" replace />}
        />
        <Route path="/reports/shared" element={<SharedReports />} />
        <Route path="/builder" element={<ReportBuilder />} />
        <Route path="/builder/new" element={<BuilderCanvas />} />
        <Route
          path="/data-sources"
          element={
            <DataSources
              simulateConnectionFailure={simulateConnectionFailure}
            />
          }
        />

        <Route path="/data-refresh" element={<DataRefresh />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/scheduled" element={<ScheduledReports />} />
        <Route path="/settings" element={<ReportSettings />} />
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/roles" element={<RolesPermissions />} />
        <Route path="/admin/templates" element={<ReportTemplates />} />
        <Route path="/admin/audit" element={<AuditLog />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

interface AppProps {
  startSignedIn?: boolean;
  simulateConnectionFailure?: boolean;
}

export function App({
  startSignedIn = false,
  simulateConnectionFailure = false,
}: AppProps) {
  return (
    <AppProvider initialAuthenticated={startSignedIn}>
      <ErpConnectionProvider>
        <BrowserRouter>
          <div className="h-full w-full bg-surface-muted">
            <StudioRoutes
              simulateConnectionFailure={simulateConnectionFailure}
            />
          </div>
        </BrowserRouter>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: "3px",
              fontSize: "13px",
              border: "1px solid #dfe3e8",
            },
          }}
        />
      </ErpConnectionProvider>
    </AppProvider>
  );
}
