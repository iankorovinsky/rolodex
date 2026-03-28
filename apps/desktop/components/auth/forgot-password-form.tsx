'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setMessage('Check your email for a password reset link.');
      setLoading(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send reset email.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            id="reset-email"
            type="email"
            placeholder="you@hackthenorth.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="border-white/20 bg-white/12 text-white placeholder:text-white/70 focus-visible:border-white/70 focus-visible:ring-white/35"
          />
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {message && <p className="text-sm text-emerald-300">{message}</p>}
        <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={loading}>
          {loading ? 'sending...' : 'send reset link'}
        </Button>
      </form>

      <p className="text-center text-sm text-white/88">
        remember your password?{' '}
        <Link to="/login" className="font-medium text-white underline decoration-white/50 underline-offset-4">
          sign in
        </Link>
      </p>
    </div>
  );
}
