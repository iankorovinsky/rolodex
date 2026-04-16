'use client';

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const PASSWORD_REQUIREMENTS = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (password: string) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: 'digit',
    label: 'One number',
    test: (password: string) => /\d/.test(password),
  },
  {
    id: 'symbol',
    label: 'One symbol',
    test: (password: string) => /[!@#$%^&*()_+\-=[\]{};':"|<>?,./`~\\]/.test(password),
  },
] as const;

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setReady(Boolean(data.session));
      })
      .catch(() => {
        setReady(false);
      });
  }, []);

  const passwordChecks = PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
  const passwordIsValid = passwordChecks.every((requirement) => requirement.met);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!ready) {
      setError('Open this page from the password reset link in your email.');
      return;
    }

    if (!passwordIsValid) {
      setError(
        'Password must include at least 8 characters, plus an uppercase letter, lowercase letter, number, and symbol.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setMessage('Password updated. Redirecting to sign in...');
      setLoading(false);
      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update password.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            id="new-password"
            type="password"
            placeholder="Choose a new password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            className="border-white/20 bg-white/12 text-white placeholder:text-white/70 focus-visible:border-white/70 focus-visible:ring-white/35"
          />
          <div className="grid gap-2 rounded-xl border border-white/10 bg-white/6 p-3">
            {passwordChecks.map((requirement) => {
              const Icon = requirement.met ? Check : Circle;

              return (
                <div
                  key={requirement.id}
                  className={cn(
                    'flex items-center gap-2 text-sm transition-colors',
                    requirement.met ? 'text-emerald-300' : 'text-white/78'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      requirement.met ? 'text-emerald-300' : 'text-white/55'
                    )}
                  />
                  <span>{requirement.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            className="border-white/20 bg-white/12 text-white placeholder:text-white/70 focus-visible:border-white/70 focus-visible:ring-white/35"
          />
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {message && <p className="text-sm text-emerald-300">{message}</p>}
        <Button
          type="submit"
          className="w-full bg-white text-black hover:bg-white/90"
          disabled={loading || !passwordIsValid}
        >
          {loading ? 'updating...' : 'update password'}
        </Button>
      </form>

      <p className="text-center text-sm text-white/88">
        back to{' '}
        <Link
          to="/login"
          className="font-medium text-white underline decoration-white/50 underline-offset-4"
        >
          sign in
        </Link>
      </p>
    </div>
  );
}
