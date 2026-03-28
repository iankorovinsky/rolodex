import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { HomeRoute } from './routes/home-route';
import { LoginRoute } from './routes/login-route';
import { SignupRoute } from './routes/signup-route';
import { ForgotPasswordRoute } from './routes/forgot-password-route';
import { ResetPasswordRoute } from './routes/reset-password-route';
import { DashboardRoute } from './routes/dashboard-route';
import { PersonRoute } from './routes/person-route';
import { IntegrationsRoute } from './routes/integrations-route';
import { AvatarOnboardingRoute } from './routes/avatar-onboarding-route';

function AppLoadingShell() {
  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          id: 'loading',
          email: 'loading@rolodex.app',
          name: 'Loading',
          avatarId: 'CAT',
        }}
      />
      <SidebarInset>
        <div className="min-h-screen bg-background p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="space-y-2">
              <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-xl bg-muted" />
              <div className="h-24 animate-pulse rounded-xl bg-muted" />
              <div className="h-24 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isAvatarOnboardingRoute = location.pathname === '/app/onboarding/avatar';
  const needsOnboarding = !user?.avatarId || !user?.name?.trim();

  if (loading) {
    return isAvatarOnboardingRoute ? (
      <div className="min-h-screen bg-[#f6efe4]" />
    ) : (
      <AppLoadingShell />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (needsOnboarding && !isAvatarOnboardingRoute) {
    return <Navigate to="/app/onboarding/avatar" replace />;
  }

  if (!needsOnboarding && isAvatarOnboardingRoute) {
    return <Navigate to="/app" replace />;
  }

  if (isAvatarOnboardingRoute) {
    return <Outlet />;
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
        <Route path="/forgot-password" element={<ForgotPasswordRoute />} />
        <Route path="/reset-password" element={<ResetPasswordRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/app/onboarding/avatar" element={<AvatarOnboardingRoute />} />
          <Route path="/app" element={<DashboardRoute />} />
          <Route path="/app/:id" element={<PersonRoute />} />
          <Route path="/app/integrations" element={<IntegrationsRoute />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
