'use client';

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      navigate('/app', { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div className="space-y-2">
          <Input
            id="email"
            type="email"
            placeholder="you@rolodex.app"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border-white/20 bg-white/12 text-white placeholder:text-white/70 focus-visible:border-white/70 focus-visible:ring-white/35"
          />
        </div>
        <div className="space-y-2">
          <Input
            id="password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border-white/20 bg-white/12 text-white placeholder:text-white/70 focus-visible:border-white/70 focus-visible:ring-white/35"
          />
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button
          type="submit"
          className="w-full bg-white text-black hover:bg-white/90"
          disabled={loading}
        >
          {loading ? 'signing in...' : 'sign in'}
        </Button>
      </form>

      <p className="text-center text-sm text-white/88">
        don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="font-medium text-white underline decoration-white/50 underline-offset-4"
        >
          sign up
        </Link>
      </p>
      <p className="text-center text-sm text-white/72">
        <Link
          to="/forgot-password"
          className="font-medium text-white underline decoration-white/40 underline-offset-4"
        >
          forgot your password?
        </Link>
      </p>
    </div>
  );
}
