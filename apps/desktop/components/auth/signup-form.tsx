'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      setError(error.message);
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
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="text-white border-white/50 bg-white/10 placeholder:text-white/60 focus-visible:border-white focus-visible:ring-white/50"
          />
        </div>
        <div className="space-y-2">
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="text-white border-white/50 bg-white/10 placeholder:text-white/60 focus-visible:border-white focus-visible:ring-white/50"
          />
        </div>
        <div className="space-y-2">
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="text-white border-white/50 bg-white/10 placeholder:text-white/60 focus-visible:border-white focus-visible:ring-white/50"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-green-300">{message}</p>}
        <Button
          type="submit"
          className="w-full bg-white text-black hover:bg-white/90"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <p className="text-center text-sm text-white">
        Already have an account?{' '}
        <Link to="/login" className="font-medium underline text-white">
          Sign in
        </Link>
      </p>
    </div>
  );
}
