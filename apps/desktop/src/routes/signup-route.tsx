import { Navigate } from 'react-router-dom';
import { SignupForm } from '@/components/auth/signup-form';
import AsciiBackground from '@/components/layout/ascii-background';
import { useAuth } from '@/lib/auth/auth-context';

export function SignupRoute() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-black">
      <AsciiBackground />
      <main className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">rolodex</h1>
          </div>
          <SignupForm />
        </div>
      </main>
    </div>
  );
}
