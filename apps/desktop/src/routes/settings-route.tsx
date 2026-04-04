import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlignRight } from 'lucide-react';
import type {
  AvatarIdValue,
  IntegrationConnection,
  IntegrationType,
  OAuthIntegrationType,
} from '@rolodex/types';
import {
  connectGranolaIntegration,
  connectOAuthIntegration,
  disconnectIntegration,
  getIntegrations,
  updateCurrentUserProfile,
} from '@/lib/rolodex/api';
import { useAuth } from '@/lib/auth/auth-context';
import { AVATAR_OPTIONS, getAvatarOption } from '@/lib/user/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const formatTimestamp = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : 'Never';

const providerMeta: Record<
  IntegrationType,
  {
    description: string;
    logo: string;
  }
> = {
  google: {
    description: 'Mail and calendar access for one or more Google accounts.',
    logo: '/integrations/google.svg',
  },
  outlook: {
    description: 'Microsoft Graph mail and calendar access for connected Outlook accounts.',
    logo: '/integrations/outlook.svg',
  },
  granola: {
    description: 'Meeting note connectivity through Granola MCP.',
    logo: '/integrations/granola.svg',
  },
  imessage: {
    description: 'Runner-based sync for Apple Messages and Contacts on macOS.',
    logo: '/integrations/imessage.svg',
  },
};

type SectionId = 'profile' | 'integrations' | 'google' | 'outlook' | 'granola' | 'imessage';

interface NavSection {
  id: SectionId;
  label: string;
  children?: Array<{ id: SectionId; label: string }>;
}

const navSections: NavSection[] = [
  { id: 'profile', label: 'Profile' },
  {
    id: 'integrations',
    label: 'Integrations',
    children: [
      { id: 'google', label: 'Google' },
      { id: 'outlook', label: 'Outlook' },
      { id: 'granola', label: 'Granola' },
      { id: 'imessage', label: 'iMessage' },
    ],
  },
];

const routeDefaultSection: Record<string, SectionId> = {
  '/app/profile': 'profile',
  '/app/integrations': 'google',
  '/app/settings': 'profile',
};

function SectionShell({
  id,
  title,
  description,
  children,
  register,
}: {
  id: SectionId;
  title: string;
  description: string;
  children: React.ReactNode;
  register: (id: SectionId, node: HTMLElement | null) => void;
}) {
  return (
    <section
      id={id}
      ref={(node) => register(id, node)}
      className="scroll-mt-24 border-t border-slate-200/70 pt-8 first:border-t-0 first:pt-0"
    >
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-[1.85rem] font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function IntegrationLogo({ type }: { type: IntegrationType }) {
  return (
    <div className="size-12 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <img src={providerMeta[type].logo} alt="" className="block size-full object-cover" />
    </div>
  );
}

function ConnectionRow({
  connection,
  isBusy,
  onDisconnect,
}: {
  connection: IntegrationConnection;
  isBusy: boolean;
  onDisconnect: (connection: IntegrationConnection) => void;
}) {
  const statusClassName =
    connection.connectionStatus === 'reconnect_required'
      ? 'border-red-200 bg-red-50 text-red-700'
      : connection.connectionStatus === 'refresh_failed'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  const statusLabel =
    connection.connectionStatus === 'reconnect_required'
      ? 'Reconnect required'
      : connection.connectionStatus === 'refresh_failed'
        ? 'Refresh failed'
        : 'Active';

  return (
    <div className="flex items-start justify-between gap-4 border-t border-slate-200/70 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-900">
          {connection.accountLabel ||
            connection.accountEmail ||
            connection.externalAccountId ||
            'Connected account'}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className={cn('rounded-full border px-2 py-0.5 font-medium', statusClassName)}>
            {statusLabel}
          </span>
          {connection.accountEmail ? <span>{connection.accountEmail}</span> : null}
          {connection.connectedAt ? (
            <span>Connected {formatTimestamp(connection.connectedAt)}</span>
          ) : null}
          {connection.lastValidatedAt ? (
            <span>Validated {formatTimestamp(connection.lastValidatedAt)}</span>
          ) : null}
          {connection.lastRefreshAt ? (
            <span>Refreshed {formatTimestamp(connection.lastRefreshAt)}</span>
          ) : null}
          {connection.reauthRequiredAt ? (
            <span>Needs reauth since {formatTimestamp(connection.reauthRequiredAt)}</span>
          ) : null}
          {connection.lastRefreshError ? <span>{connection.lastRefreshError}</span> : null}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={isBusy}
        onClick={() => onDisconnect(connection)}
      >
        Disconnect
      </Button>
    </div>
  );
}

function ProviderSection({
  type,
  connections,
  isBusy,
  onConnect,
  onDisconnect,
}: {
  type: IntegrationType;
  connections: IntegrationConnection[];
  isBusy: boolean;
  onConnect: () => void;
  onDisconnect: (connection: IntegrationConnection) => void;
}) {
  const meta = providerMeta[type];
  const providerLabel =
    type === 'granola'
      ? 'Granola'
      : type === 'google'
        ? 'Google'
        : type === 'outlook'
          ? 'Outlook'
          : 'iMessage';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <IntegrationLogo type={type} />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-950">{providerLabel}</h3>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">{meta.description}</p>
          </div>
        </div>
        {type !== 'imessage' ? (
          <Button onClick={onConnect} disabled={isBusy} className="rounded-full px-5">
            {connections.length > 0 ? 'Connect another' : 'Connect account'}
          </Button>
        ) : null}
      </div>

      {connections.length > 0 ? (
        <div className="rounded-3xl bg-white/55 px-5 py-2 ring-1 ring-slate-200/70 backdrop-blur-sm">
          {connections.map((connection) => (
            <ConnectionRow
              key={connection.id}
              connection={connection}
              isBusy={isBusy}
              onDisconnect={onDisconnect}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white/45 px-5 py-4 text-sm text-slate-500 ring-1 ring-slate-200/70">
          {type === 'imessage'
            ? 'Manage iMessage sync through the runner controls below.'
            : 'No accounts connected yet.'}
        </div>
      )}
    </div>
  );
}

export function SettingsRoute() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const runnerSupported = window.rolodexDesktop?.runnerSupported ?? false;
  const desktopPlatform = window.rolodexDesktop?.platform ?? 'unknown';

  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState<string | null>(null);
  const [isGranolaConnecting, setIsGranolaConnecting] = useState(false);
  const [connectingType, setConnectingType] = useState<OAuthIntegrationType | 'granola' | null>(
    null
  );
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarIdValue>(
    user?.avatarId ?? getAvatarOption(user?.avatarId).id
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [isIMessageModalOpen, setIsIMessageModalOpen] = useState(false);
  const [imessagePathInput, setImessagePathInput] = useState('');
  const [imessageConnectedPath, setIMessageConnectedPath] = useState<string | null>(null);
  const [isValidatingIMessagePath, setIsValidatingIMessagePath] = useState(false);
  const sectionRefs = useRef(new Map<SectionId, HTMLElement>());

  const IMESSAGE_PATH_KEY = 'rolodex.imessage.connectedPath';

  useEffect(() => {
    setProfileName(user?.name ?? '');
    setSelectedAvatarId(user?.avatarId ?? getAvatarOption(user?.avatarId).id);
  }, [user]);

  useEffect(() => {
    const savedPath = window.localStorage.getItem(IMESSAGE_PATH_KEY);
    if (savedPath) {
      setIMessageConnectedPath(savedPath);
      setImessagePathInput(savedPath);
      return;
    }

    setImessagePathInput('~/Library/Messages/chat.db');
  }, []);

  const registerSection = (id: SectionId, node: HTMLElement | null) => {
    if (!node) {
      sectionRefs.current.delete(id);
      return;
    }

    sectionRefs.current.set(id, node);
  };

  const loadIntegrations = async () => {
    setIntegrationError(null);

    try {
      const integrationData = await getIntegrations();

      setIntegrations(integrationData);
    } catch (error) {
      setIntegrationError(
        error instanceof Error ? error.message : 'Failed to load integration settings.'
      );
    }
  };

  useEffect(() => {
    void loadIntegrations();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id as SectionId);
        }
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.15, 0.4, 0.7],
      }
    );

    sectionRefs.current.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sectionFromHash = location.hash.replace('#', '') as SectionId;
    const fallbackSection = routeDefaultSection[location.pathname] ?? 'profile';
    const target = sectionFromHash || fallbackSection;

    const node = sectionRefs.current.get(target);
    if (node) {
      requestAnimationFrame(() => {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      setActiveSection(target);
      return;
    }

    if (!location.hash) {
      navigate(`${location.pathname}#${fallbackSection}`, { replace: true });
    }
  }, [location.hash, location.pathname, navigate]);

  const groupedConnections = useMemo(
    () =>
      new Map<IntegrationType, IntegrationConnection[]>(
        (['google', 'outlook', 'granola', 'imessage'] as IntegrationType[]).map((type) => [
          type,
          integrations.filter((integration) => integration.type === type),
        ])
      ),
    [integrations]
  );

  const navigateToSection = (id: SectionId) => {
    navigate(`/app/settings#${id === 'integrations' ? 'google' : id}`);
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      setProfileError('A name is required.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSaved(null);

    try {
      await updateCurrentUserProfile({
        name: profileName.trim(),
        avatarId: selectedAvatarId,
      });
      await refreshUser();
      setProfileSaved('Profile updated.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOAuthConnect = async (type: OAuthIntegrationType) => {
    if (!window.rolodexDesktop?.startProviderOAuth) {
      setIntegrationError(
        `${type === 'google' ? 'Google' : 'Outlook'} sign-in is only available from the desktop app.`
      );
      return;
    }

    setConnectingType(type);
    setIntegrationError(null);

    try {
      const oauthResult = await window.rolodexDesktop.startProviderOAuth(type);

      await connectOAuthIntegration(type, {
        accessToken: oauthResult.accessToken,
        refreshToken: oauthResult.refreshToken ?? null,
        tokenType: oauthResult.tokenType ?? null,
        scope: oauthResult.scope ?? null,
        expiresAt: oauthResult.expiresAt ?? null,
        externalAccountId: oauthResult.externalAccountId,
        accountEmail: oauthResult.accountEmail ?? null,
        accountLabel: oauthResult.accountLabel ?? null,
      });

      await loadIntegrations();
    } catch (error) {
      setIntegrationError(error instanceof Error ? error.message : `Failed to connect ${type}.`);
    } finally {
      setConnectingType(null);
    }
  };

  const handleGranolaConnect = async () => {
    if (!window.rolodexDesktop?.startGranolaOAuth) {
      setIntegrationError('Granola sign-in is only available from the desktop app.');
      return;
    }

    setIsGranolaConnecting(true);
    setConnectingType('granola');
    setIntegrationError(null);

    try {
      const oauthResult = await window.rolodexDesktop.startGranolaOAuth();
      await connectGranolaIntegration(oauthResult);
      await loadIntegrations();
    } catch (error) {
      setIntegrationError(error instanceof Error ? error.message : 'Failed to connect Granola.');
    } finally {
      setIsGranolaConnecting(false);
      setConnectingType(null);
    }
  };

  const handleDisconnect = async (connection: IntegrationConnection) => {
    setDisconnectingId(connection.id);
    setIntegrationError(null);

    try {
      await disconnectIntegration(connection.id);
      await loadIntegrations();
    } catch (error) {
      setIntegrationError(
        error instanceof Error ? error.message : `Failed to disconnect ${connection.type}.`
      );
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleConnectIMessage = async () => {
    if (!window.rolodexDesktop?.validateIMessagePath) {
      setIntegrationError('iMessage setup is only available from the desktop app.');
      return;
    }

    setIsValidatingIMessagePath(true);
    setIntegrationError(null);

    try {
      const result = await window.rolodexDesktop.validateIMessagePath(imessagePathInput);
      if (!result.valid) {
        throw new Error('Unable to validate the Messages database path.');
      }

      window.localStorage.setItem(IMESSAGE_PATH_KEY, result.path);
      setIMessageConnectedPath(result.path);
      setIsIMessageModalOpen(false);
    } catch (error) {
      setIntegrationError(
        error instanceof Error ? error.message : 'Failed to validate the Messages database path.'
      );
    } finally {
      setIsValidatingIMessagePath(false);
    }
  };

  const handleDisconnectIMessage = () => {
    window.localStorage.removeItem(IMESSAGE_PATH_KEY);
    setIMessageConnectedPath(null);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f0fdf4,transparent_24%),radial-gradient(circle_at_top_right,#eff6ff,transparent_28%),linear-gradient(180deg,#fcfcfb,#f8fafc)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl items-start gap-10">
        <main className="min-w-0 flex-1 space-y-14">
          {(integrationError || profileError || profileSaved) && (
            <div
              className={cn(
                'rounded-2xl px-4 py-3 text-sm ring-1',
                integrationError || profileError
                  ? 'bg-red-50/90 text-red-700 ring-red-200'
                  : 'bg-emerald-50/90 text-emerald-700 ring-emerald-200'
              )}
            >
              {integrationError || profileError || profileSaved}
            </div>
          )}

          <SectionShell
            id="profile"
            title="Profile"
            description="This is the user identity that anchors the rest of your workspace. Update your display name and avatar here."
            register={registerSection}
          >
            <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
              <div className="rounded-[2rem] bg-white/45 p-6 ring-1 ring-slate-200/70 backdrop-blur-sm">
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
                    <Input
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      placeholder="Your name"
                      className="h-11 rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                    <Input
                      value={user?.email ?? ''}
                      disabled
                      className="h-11 rounded-xl border-slate-200 bg-slate-100 text-slate-500"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-[1.5rem] bg-white/70 p-4 ring-1 ring-slate-200/70">
                    <div>
                      <div className="text-sm font-medium text-slate-900">Current profile</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {user?.name || user?.email || 'Rolodex user'}
                      </div>
                    </div>
                    <div className="size-16 overflow-hidden rounded-full ring-1 ring-slate-200">
                      <img
                        src={getAvatarOption(selectedAvatarId).src}
                        alt={getAvatarOption(selectedAvatarId).label}
                        className="size-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => void handleSaveProfile()}
                      disabled={isSavingProfile || !profileName.trim()}
                      className="rounded-full px-6"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save profile'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] bg-white/45 p-6 ring-1 ring-slate-200/70 backdrop-blur-sm">
                <div className="mb-4">
                  <div className="text-sm font-medium text-slate-900">Avatar</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Pick the companion shown in the app sidebar and profile controls.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {AVATAR_OPTIONS.map((avatar) => {
                    const selected = avatar.id === selectedAvatarId;

                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setSelectedAvatarId(avatar.id)}
                        className={cn(
                          'rounded-[1.25rem] bg-white/85 p-2 text-left ring-1 transition-all',
                          selected
                            ? 'ring-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.10)]'
                            : 'ring-slate-200 hover:ring-slate-300'
                        )}
                      >
                        <div className="overflow-hidden rounded-[1rem]">
                          <img
                            src={avatar.src}
                            alt={avatar.label}
                            className="aspect-square w-full object-cover"
                          />
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-800">
                          {avatar.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="google"
            title="Google"
            description="Connect multiple Gmail and Google Calendar accounts and disconnect them independently."
            register={registerSection}
          >
            <ProviderSection
              type="google"
              connections={groupedConnections.get('google') ?? []}
              isBusy={
                connectingType === 'google' ||
                integrations.some((item) => item.id === disconnectingId)
              }
              onConnect={() => void handleOAuthConnect('google')}
              onDisconnect={(connection) => void handleDisconnect(connection)}
            />
          </SectionShell>

          <SectionShell
            id="outlook"
            title="Outlook"
            description="Connect Microsoft accounts through Entra and manage them as separate integration records."
            register={registerSection}
          >
            <ProviderSection
              type="outlook"
              connections={groupedConnections.get('outlook') ?? []}
              isBusy={
                connectingType === 'outlook' ||
                integrations.some((item) => item.id === disconnectingId)
              }
              onConnect={() => void handleOAuthConnect('outlook')}
              onDisconnect={(connection) => void handleDisconnect(connection)}
            />
          </SectionShell>

          <SectionShell
            id="granola"
            title="Granola"
            description="Authorize Granola meeting notes and inspect MCP validation status from the same settings surface."
            register={registerSection}
          >
            <ProviderSection
              type="granola"
              connections={groupedConnections.get('granola') ?? []}
              isBusy={
                isGranolaConnecting ||
                connectingType === 'granola' ||
                integrations.some((item) => item.id === disconnectingId)
              }
              onConnect={() => void handleGranolaConnect()}
              onDisconnect={(connection) => void handleDisconnect(connection)}
            />
          </SectionShell>

          <SectionShell
            id="imessage"
            title="iMessage"
            description="Connect this Mac to Rolodex by pointing the app at your local Messages database."
            register={registerSection}
          >
            {!runnerSupported ? (
              <div className="mt-5 rounded-2xl bg-amber-50/90 p-5 text-amber-950 ring-1 ring-amber-300">
                <div className="text-base font-medium">Runner unavailable on this device</div>
                <p className="mt-2 text-sm leading-6">
                  This device reports <code>{desktopPlatform}</code>. The Messages runner is only
                  supported on macOS, so token creation and setup actions are disabled here.
                </p>
              </div>
            ) : null}

            <div className="rounded-[2rem] bg-white/45 p-6 ring-1 ring-slate-200/70 backdrop-blur-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-slate-950">This Mac</div>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">
                    Use a local Messages database path to mark this Mac as connected. Once the file
                    is detected, this device is considered ready for future iMessage sync work.
                  </p>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {imessageConnectedPath ? 'Connected' : 'Not connected'}
                  </div>
                </div>

                <div className="flex gap-2">
                  {imessageConnectedPath ? (
                    <Button
                      variant="outline"
                      onClick={handleDisconnectIMessage}
                      className="rounded-full px-5"
                    >
                      Disconnect
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => setIsIMessageModalOpen(true)}
                    disabled={!runnerSupported}
                    className="rounded-full px-5"
                  >
                    {imessageConnectedPath ? 'Edit path' : 'Connect'}
                  </Button>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200/70 pt-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Messages database
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {imessageConnectedPath || 'Not connected yet.'}
                </div>
              </div>
            </div>
          </SectionShell>
        </main>

        <aside className="sticky top-10 hidden shrink-0 self-start xl:block">
          <div className="group/rail flex w-14 flex-col items-end transition-all duration-200 hover:w-52">
            <div className="rounded-[1.75rem] bg-white/55 px-3 py-3 ring-1 ring-slate-200/70 backdrop-blur-sm">
              <div className="mb-3 flex justify-end">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white">
                  <AlignRight className="h-4 w-4" />
                </div>
              </div>

              <nav className="space-y-1">
                {navSections.map((section) => {
                  const isParentActive =
                    activeSection === section.id ||
                    section.children?.some((child) => child.id === activeSection);

                  return (
                    <div key={section.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => navigateToSection(section.id)}
                        className="flex w-full items-center justify-end gap-3 rounded-full px-2 py-2 text-right transition-colors hover:bg-slate-100/80"
                      >
                        <span
                          className={cn(
                            'truncate text-sm transition-all duration-200',
                            isParentActive
                              ? 'text-slate-950 opacity-100 group-hover/rail:max-w-32'
                              : 'text-slate-500 opacity-0 group-hover/rail:max-w-32 group-hover/rail:opacity-100',
                            'max-w-0 group-hover/rail:mr-1'
                          )}
                        >
                          {section.label}
                        </span>
                        <span
                          className={cn(
                            'h-0.5 rounded-full bg-slate-300 transition-all',
                            isParentActive ? 'w-8 bg-slate-950' : 'w-5 hover:w-8'
                          )}
                        />
                      </button>

                      {section.children ? (
                        <div className="space-y-1 pr-0.5">
                          {section.children.map((child) => {
                            const isChildActive = activeSection === child.id;

                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => navigateToSection(child.id)}
                                className="flex w-full items-center justify-end gap-3 rounded-full px-2 py-1.5 text-right transition-colors hover:bg-slate-100/70"
                              >
                                <span
                                  className={cn(
                                    'truncate text-xs transition-all duration-200',
                                    isChildActive
                                      ? 'text-slate-800 opacity-100 group-hover/rail:max-w-28'
                                      : 'text-slate-400 opacity-0 group-hover/rail:max-w-28 group-hover/rail:opacity-100',
                                    'max-w-0'
                                  )}
                                >
                                  {child.label}
                                </span>
                                <span
                                  className={cn(
                                    'h-1.5 rounded-full transition-all',
                                    isChildActive ? 'w-1.5 bg-slate-950' : 'w-1.5 bg-slate-300'
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={isIMessageModalOpen} onOpenChange={setIsIMessageModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect iMessage on this Mac</DialogTitle>
            <DialogDescription>
              Enter the local path to your Messages database. If the file can be read, this Mac will
              be marked as connected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">chat.db path</label>
              <Input
                value={imessagePathInput}
                onChange={(event) => setImessagePathInput(event.target.value)}
                placeholder="/Users/your-user/Library/Messages/chat.db"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              Rolodex will only validate that the file exists and is readable from this desktop app.
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsIMessageModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleConnectIMessage()}
                disabled={!runnerSupported || isValidatingIMessagePath || !imessagePathInput.trim()}
              >
                {isValidatingIMessagePath ? 'Checking...' : 'Connect'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
