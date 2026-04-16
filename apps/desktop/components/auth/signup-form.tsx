'use client';

import { useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
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

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const passwordChecks = PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
  const passwordIsValid = passwordChecks.every((requirement) => requirement.met);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!passwordIsValid) {
      setError(
        'Password must include at least 8 characters, plus an uppercase letter, lowercase letter, number, and symbol.'
      );
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError(
        'An account with this email already exists. Try signing in or resetting your password.'
      );
      setLoading(false);
      return;
    }

    setMessage('Check your email for a confirmation link.');
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleEmailSignup} className="space-y-4">
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
            placeholder="Rolodex!Meet1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        {error && <p className="text-sm text-red-300">{error}</p>}
        {message && <p className="text-sm text-emerald-300">{message}</p>}
        <Button
          type="submit"
          className="w-full bg-white text-black hover:bg-white/90"
          disabled={loading || !passwordIsValid}
        >
          {loading ? 'creating account...' : 'create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-white/88">
        already have an account?{' '}
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
