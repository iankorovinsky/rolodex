import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AvatarIdValue } from '@rolodex/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/auth-context';
import { updateCurrentUserProfile } from '@/lib/rolodex/api';
import { AVATAR_OPTIONS, DEFAULT_AVATAR_ID } from '@/lib/user/avatar';

export function AvatarOnboardingRoute() {
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarIdValue>(DEFAULT_AVATAR_ID);
  const [name, setName] = useState(user?.name ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setLoading(true);
    setError(null);

    try {
      await updateCurrentUserProfile({
        name: name.trim(),
        avatarId: selectedAvatarId,
      });
      await refreshUser();
      navigate('/app', { replace: true });
    } catch (avatarError) {
      setError(avatarError instanceof Error ? avatarError.message : 'Unable to save your avatar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6efe4] px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center">
        <div className="grid gap-8 rounded-[2rem] border border-black/10 bg-white/85 p-6 shadow-[0_32px_80px_rgba(15,23,42,0.12)] backdrop-blur md:p-10">
          <h1 className="text-center font-serif text-3xl tracking-tight text-slate-950 sm:text-4xl">
            choose your companion
          </h1>

          <div className="mx-auto w-full max-w-md">
            <Input
              id="onboarding-name"
              type="text"
              placeholder="your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-12 rounded-full border-black/10 bg-white/80 px-5 text-base text-slate-950 placeholder:text-slate-400 focus-visible:border-slate-950 focus-visible:ring-slate-950/15"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AVATAR_OPTIONS.map((avatar) => {
              const selected = avatar.id === selectedAvatarId;

              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedAvatarId(avatar.id)}
                  className={[
                    'group flex justify-center rounded-full p-2 transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20',
                  ].join(' ')}
                  aria-label={avatar.label}
                  aria-pressed={selected}
                >
                  <div
                    className={[
                      'w-full max-w-[8.5rem] overflow-hidden rounded-full bg-white/70 transition-all',
                      selected
                        ? 'ring-4 ring-slate-950 shadow-lg shadow-slate-900/20'
                        : 'ring-1 ring-black/10 group-hover:ring-slate-400',
                    ].join(' ')}
                  >
                    <img src={avatar.src} alt={avatar.label} className="aspect-square w-full object-cover" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              {error ? <span className="text-red-600">{error}</span> : 'you can change this later!'}
            </div>
            <Button
              onClick={handleContinue}
              disabled={loading || !name.trim()}
              className="h-11 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
            >
              {loading ? 'saving avatar...' : 'continue'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
