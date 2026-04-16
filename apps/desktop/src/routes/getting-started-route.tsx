'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HandHeart, MessageSquare, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MockIntegrationsTable } from '@/components/onboarding/mock-integrations-table';
import { MockPersonDetailCard } from '@/components/onboarding/mock-person-detail-card';
import { MockScoutInboxEmail } from '@/components/onboarding/mock-scout-email';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TiltCard } from '@/components/ui/tilt-card';
import { updateCurrentUserProfile } from '@/lib/rolodex/api';
import { markGettingStartedComplete } from '@/lib/onboarding';
import { useAuth } from '@/lib/auth/auth-context';
import { AVATAR_OPTIONS, DEFAULT_AVATAR_ID } from '@/lib/user/avatar';
import { cn } from '@/lib/utils';
import type { AvatarIdValue } from '@rolodex/types';

type OnboardingStep = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
};

const STEPS: OnboardingStep[] = [
  {
    id: 'integrations',
    eyebrow: 'Step 1',
    title: 'Setup Your Integrations',
    description:
      'Integrations pull in meeting, email, and calendar context so that you never have to update Rolodex by hand.',
  },
  {
    id: 'rolodex-swipe',
    eyebrow: 'Step 2',
    title: 'Swipe. Not Type.',
    description:
      'Rolodex will ask you to review people you connect with for the first time, whether by phone or by email.',
  },
  {
    id: 'rolodex',
    eyebrow: 'Step 3',
    title: 'View Your Rolodex',
    description: 'Each person profile shows the little details: notes, asks, and favours.',
  },
  {
    id: 'scouts',
    eyebrow: 'Step 4',
    title: 'Scouts',
    description:
      'Scouts watch for updates, changes, and alerts in the world around you, letting you know whenever something pops up.',
  },
];

const PROFILE_STEP: OnboardingStep = {
  id: 'profile',
  eyebrow: 'Setup',
  title: 'Profile',
  description: "Let's start with you!",
};

function splitName(name: string | null | undefined) {
  const trimmed = name?.trim() ?? '';

  if (!trimmed) {
    return {
      firstName: '',
      lastName: '',
    };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);

  return {
    firstName,
    lastName: rest.join(' '),
  };
}

function ProfileCardContent({
  selectedAvatarId,
  firstName,
  lastName,
}: {
  selectedAvatarId: AvatarIdValue;
  firstName: string;
  lastName: string;
}) {
  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || 'Your name';
  const avatar = AVATAR_OPTIONS.find((item) => item.id === selectedAvatarId) ?? AVATAR_OPTIONS[0];

  return (
    <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(28,25,23,0.08)]">
      <div className="flex items-center justify-between">
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Alpha
        </div>
        <div className="text-sm text-stone-400">rolodex.</div>
      </div>

      <div className="mt-8 flex flex-col items-center text-center">
        <div className="size-32 overflow-hidden rounded-full ring-1 ring-stone-200 shadow-[0_10px_30px_rgba(28,25,23,0.08)]">
          <img src={avatar.src} alt={avatar.label} className="size-full object-cover" />
        </div>
        <h3 className="mt-6 text-3xl font-medium tracking-tight text-stone-950">{displayName}</h3>
      </div>
    </div>
  );
}

function ProfileSetupPreview({
  selectedAvatarId,
  firstName,
  lastName,
}: {
  selectedAvatarId: AvatarIdValue;
  firstName: string;
  lastName: string;
}) {
  return (
    <div className="flex w-full max-w-md justify-center">
      <ProfileCardContent
        selectedAvatarId={selectedAvatarId}
        firstName={firstName}
        lastName={lastName}
      />
    </div>
  );
}

function MockIntegrationsPanel() {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="w-full max-w-4xl">
        <MockIntegrationsTable />
      </div>
    </div>
  );
}

function MockSwipeDeck() {
  return (
    <div className="mx-auto flex w-full max-w-xl justify-center">
      <TiltCard className="w-full rounded-lg" rotate={6}>
        <div className="w-full rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium">Maya Chen</h3>
                <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
              </div>

              <p className="truncate text-sm text-muted-foreground">Product Lead @ Tribal</p>

              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                Met through a second-degree intro. Overlapping email and calendar threads with your
                team.
              </p>

              <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                Re: recruiting brief — could you share when you have a chance?
              </p>

              <div className="mt-2 flex flex-wrap gap-1">
                {['Tribal', 'Email', 'Calendar'].map((tag) => (
                  <Badge key={tag} variant="outline" className="px-1.5 py-0 text-xs font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>2</span>
              </div>
              <div className="flex items-center gap-1">
                <HandHeart className="h-3 w-3" />
                <span>1</span>
              </div>
            </div>
          </div>
        </div>
      </TiltCard>
    </div>
  );
}

function MockRolodexDetail() {
  return (
    <TiltCard className="w-full max-w-3xl rounded-[1.8rem]" rotate={5}>
      <MockPersonDetailCard />
    </TiltCard>
  );
}

function MockScoutsPanel() {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="w-full max-w-3xl">
        <MockScoutInboxEmail />
      </div>
    </div>
  );
}

function StepPreview({ stepId }: { stepId: string }) {
  if (stepId === 'integrations') {
    return <MockIntegrationsPanel />;
  }

  if (stepId === 'rolodex-swipe') {
    return <MockSwipeDeck />;
  }

  if (stepId === 'rolodex') {
    return <MockRolodexDetail />;
  }

  return <MockScoutsPanel />;
}

export function GettingStartedRoute() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const parsedName = splitName([user?.firstName, user?.lastName].filter(Boolean).join(' '));
  const visibleSteps = [PROFILE_STEP, ...STEPS];
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarIdValue>(
    user?.avatarId ?? DEFAULT_AVATAR_ID
  );
  const [firstName, setFirstName] = useState(parsedName.firstName);
  const [lastName, setLastName] = useState(parsedName.lastName);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [exitingToApp, setExitingToApp] = useState(false);
  const [exitFadeArmed, setExitFadeArmed] = useState(false);

  const step = visibleSteps[stepIndex];
  const isLastStep = stepIndex === visibleSteps.length - 1;
  const isProfileStep = step.id === 'profile';

  const progressLabel = useMemo(
    () => `Step ${stepIndex + 1} of ${visibleSteps.length}`,
    [stepIndex, visibleSteps.length]
  );

  const navigateToApp = useCallback(() => {
    if (user?.id) {
      markGettingStartedComplete(user.id);
    }
    navigate('/app', { replace: true });
  }, [navigate, user?.id]);

  const beginExitToApp = () => {
    setExitFadeArmed(false);
    setExitingToApp(true);
  };

  useEffect(() => {
    if (!exitingToApp) {
      return;
    }
    const armFade = window.setTimeout(() => setExitFadeArmed(true), 20);
    return () => window.clearTimeout(armFade);
  }, [exitingToApp]);

  useEffect(() => {
    if (!exitingToApp) {
      return;
    }
    const go = window.setTimeout(() => {
      navigateToApp();
    }, 520);
    return () => window.clearTimeout(go);
  }, [exitingToApp, navigateToApp]);

  return (
    <main
      className={cn(
        'relative min-h-screen bg-[#fcfcfa] px-8 py-8 text-stone-950',
        exitingToApp && 'pointer-events-none'
      )}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-10 h-1.5 overflow-hidden rounded-full bg-stone-200/80">
          <div
            className="h-full rounded-full bg-emerald-700 transition-[width] duration-300"
            style={{ width: `${((stepIndex + 1) / visibleSteps.length) * 100}%` }}
          />
        </div>

        <div
          className={[
            'grid min-h-[min(78vh,880px)] items-center gap-12 lg:divide-x lg:divide-stone-200',
            isProfileStep ? 'lg:grid-cols-[0.6fr_0.4fr]' : 'lg:grid-cols-[0.88fr_1.12fr]',
          ].join(' ')}
        >
          <section className="flex min-h-0 items-center justify-center px-6 py-8 lg:px-12 lg:py-10">
            <div className="flex w-full max-w-xl flex-col">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                  {progressLabel}
                </p>

                <h1 className="mt-8 max-w-md text-5xl font-semibold tracking-tight text-stone-950">
                  {step.title}
                </h1>
                <p className="mt-5 max-w-lg text-xl leading-9 text-stone-600">{step.description}</p>

                {isProfileStep ? (
                  <div className="mt-10 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        id="onboarding-first-name"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        className="h-12 rounded-xl border-black/10 bg-white px-4 text-base text-stone-950 placeholder:text-stone-400 focus-visible:border-stone-950 focus-visible:ring-stone-950/15"
                      />
                      <Input
                        id="onboarding-last-name"
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        className="h-12 rounded-xl border-black/10 bg-white px-4 text-base text-stone-950 placeholder:text-stone-400 focus-visible:border-stone-950 focus-visible:ring-stone-950/15"
                      />
                    </div>

                    <div>
                      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
                        {AVATAR_OPTIONS.map((avatar) => {
                          const selected = avatar.id === selectedAvatarId;

                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => setSelectedAvatarId(avatar.id)}
                              className="group flex justify-center rounded-full p-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/20"
                              aria-label={avatar.label}
                              aria-pressed={selected}
                            >
                              <div
                                className={[
                                  'w-full max-w-[6.5rem] overflow-hidden rounded-full bg-white transition-all',
                                  selected
                                    ? 'ring-4 ring-stone-950 shadow-lg shadow-stone-900/20'
                                    : 'ring-1 ring-black/10 group-hover:ring-stone-400 hover:ring-4',
                                ].join(' ')}
                              >
                                <img
                                  src={avatar.src}
                                  alt={avatar.label}
                                  className="aspect-square w-full object-cover"
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {isProfileStep && profileError ? (
                  <p className="mt-4 text-sm text-red-600">{profileError}</p>
                ) : null}
              </div>

              <div className="mt-12">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    className="rounded-full px-4 text-stone-600"
                    onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                    disabled={stepIndex === 0 || isSavingProfile || exitingToApp}
                  >
                    Back
                  </Button>
                  <Button
                    className="rounded-xl bg-emerald-700 px-6 text-white hover:bg-emerald-800"
                    onClick={async () => {
                      if (isProfileStep) {
                        setIsSavingProfile(true);
                        setProfileError(null);

                        try {
                          await updateCurrentUserProfile({
                            firstName: firstName.trim(),
                            lastName: lastName.trim() || null,
                            avatarId: selectedAvatarId,
                          });
                          await refreshUser();
                          setStepIndex((current) => current + 1);
                        } catch (error) {
                          setProfileError(
                            error instanceof Error ? error.message : 'Unable to save your profile.'
                          );
                        } finally {
                          setIsSavingProfile(false);
                        }
                        return;
                      }

                      if (isLastStep) {
                        beginExitToApp();
                        return;
                      }
                      setStepIndex((current) => current + 1);
                    }}
                    disabled={
                      (isProfileStep && !firstName.trim()) || isSavingProfile || exitingToApp
                    }
                  >
                    {isProfileStep
                      ? isSavingProfile
                        ? 'Saving profile...'
                        : 'Save'
                      : isLastStep
                        ? 'Get Started'
                        : 'Next'}
                  </Button>
                </div>

                <div className="mt-10 flex items-center gap-2">
                  {visibleSteps.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStepIndex(index)}
                      aria-label={`Go to step ${index + 1}`}
                      className={
                        index === stepIndex
                          ? 'h-1.5 w-10 rounded-full bg-emerald-700 transition-all'
                          : 'h-1.5 w-4 rounded-full bg-stone-200 transition-all hover:bg-stone-300'
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 items-center justify-center px-6 py-8 lg:px-12 lg:py-10">
            <div className="flex w-full max-w-3xl justify-center">
              {isProfileStep ? (
                <ProfileSetupPreview
                  selectedAvatarId={selectedAvatarId}
                  firstName={firstName}
                  lastName={lastName}
                />
              ) : (
                <StepPreview stepId={step.id} />
              )}
            </div>
          </section>
        </div>
      </div>

      {exitingToApp ? (
        <div
          className={cn(
            'fixed inset-0 z-[100] bg-background transition-opacity duration-500 ease-out',
            exitFadeArmed ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden
        />
      ) : null}
    </main>
  );
}
