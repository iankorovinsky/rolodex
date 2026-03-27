import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import AsciiBackground from '@/components/layout/ascii-background';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export function HomeRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        navigate('/app', { replace: true });
      }
    }

    void checkUser();
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen flex-col bg-black">
      <AsciiBackground />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-16 pt-16 pb-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">rolodex</h1>
          <p className="mt-2 text-lg text-white/90">A desktop CRM for the people in your orbit.</p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link to="/login">
              open rolodex <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
