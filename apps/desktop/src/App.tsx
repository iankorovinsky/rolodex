import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { HomeRoute } from './routes/home-route';
import { LoginRoute } from './routes/login-route';
import { SignupRoute } from './routes/signup-route';
import { DashboardRoute } from './routes/dashboard-route';
import { PersonRoute } from './routes/person-route';
import { IntegrationsRoute } from './routes/integrations-route';

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<SignupRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/app" element={<DashboardRoute />} />
          <Route path="/app/:id" element={<PersonRoute />} />
          <Route path="/app/integrations" element={<IntegrationsRoute />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
