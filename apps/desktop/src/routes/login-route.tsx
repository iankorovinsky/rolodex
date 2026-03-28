import { Navigate, Link } from 'react-router-dom';
import { LoginForm } from '@/components/auth/login-form';
import AsciiBackground from '@/components/layout/ascii-background';
import { useAuth } from '@/lib/auth/auth-context';

export function LoginRoute() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-black">
      <AsciiBackground />
      <div className="absolute inset-0 z-0 bg-black/45" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/12 bg-black/72 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="text-center">
            <Link to="/">
              <h1 className="cursor-pointer text-2xl font-bold tracking-tight text-white transition-colors hover:text-white/85">
                rolodex
              </h1>
            </Link>
          </div>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
