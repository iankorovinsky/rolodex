import { useCallback, useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  INTEGRATION_CONFIGS,
  type AvatarIdValue,
  type IntegrationConnection,
  type IntegrationType,
  type OAuthIntegrationType,
} from '@rolodex/types';
import { toast } from 'sonner';
import {
  connectGranolaIntegration,
  connectOAuthIntegration,
  disconnectIntegration,
  getIntegrations,
  updateCurrentUserProfile,
} from '@/lib/rolodex/api';
import { useAuth } from '@/lib/auth/auth-context';
import { applyTheme, getStoredTheme, type ThemePreference } from '@/lib/theme';
import { AVATAR_OPTIONS, getAvatarOption } from '@/lib/user/avatar';
import {
  IntegrationsTable,
  type IntegrationsTableRow,
} from '@/components/settings/integrations-table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const providerMeta: Record<
  IntegrationType,
  {
    logo: string;
  }
> = {
  google: {
    logo: '/integrations/google.svg',
  },
  outlook: {
    logo: '/integrations/outlook.svg',
  },
  granola: {
    logo: '/integrations/granola.svg',
  },
  imessage: {
    logo: '/integrations/imessage.svg',
  },
};

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-4 first:pt-3 last:pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0 shrink-0 sm:max-w-[40%]">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description ? (
          <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 sm:text-right">{children}</div>
    </div>
  );
}

export function SettingsRoute() {
  const { user, refreshUser, setUser } = useAuth();
  const runnerSupported = window.rolodexDesktop?.runnerSupported ?? false;
  const desktopPlatform = window.rolodexDesktop?.platform ?? 'unknown';

  const [theme, setTheme] = useState<ThemePreference>(() => getStoredTheme());
  const [integrations, setIntegrations] = useState<IntegrationConnection[] | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isGranolaConnecting, setIsGranolaConnecting] = useState(false);
  const [connectingType, setConnectingType] = useState<OAuthIntegrationType | 'granola' | null>(
    null
  );
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [profileFirstName, setProfileFirstName] = useState(user?.firstName ?? '');
  const [profileLastName, setProfileLastName] = useState(user?.lastName ?? '');
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarIdValue>(
    user?.avatarId ?? getAvatarOption(user?.avatarId).id
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const IMESSAGE_PATH_KEY = 'rolodex.imessage.connectedPath';
  const IMESSAGE_DEVICE_NAME_KEY = 'rolodex.imessage.deviceName';
  const IMESSAGE_DEFAULT_CHAT_DB = '~/Library/Messages/chat.db';
  const IMESSAGE_LOCAL_CONNECTION_ID = '00000000-0000-4000-8000-000000000001';

  const [isIMessageModalOpen, setIsIMessageModalOpen] = useState(false);
  const [imessageModalDeviceName, setImessageModalDeviceName] = useState('');
  const [imessageModalPath, setImessageModalPath] = useState(IMESSAGE_DEFAULT_CHAT_DB);
  const [imessageConnectedPath, setIMessageConnectedPath] = useState<string | null>(null);
  const [imessageDeviceName, setImessageDeviceName] = useState('');
  const [isValidatingIMessagePath, setIsValidatingIMessagePath] = useState(false);
  const profileDisplayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Rolodex user';

  useEffect(() => {
    setProfileFirstName(user?.firstName ?? '');
    setProfileLastName(user?.lastName ?? '');
    setSelectedAvatarId(user?.avatarId ?? getAvatarOption(user?.avatarId).id);
  }, [user]);

  useEffect(() => {
    const savedPath = window.localStorage.getItem(IMESSAGE_PATH_KEY);
    const savedName = window.localStorage.getItem(IMESSAGE_DEVICE_NAME_KEY);
    if (savedPath) {
      setIMessageConnectedPath(savedPath);
      if (savedName?.trim()) {
        setImessageDeviceName(savedName.trim());
      } else {
        window.localStorage.setItem(IMESSAGE_DEVICE_NAME_KEY, 'This Mac');
        setImessageDeviceName('This Mac');
      }
    }
  }, []);

  useEffect(() => {
    if (isIMessageModalOpen) {
      setImessageModalDeviceName(imessageDeviceName.trim() || '');
      setImessageModalPath(
        imessageConnectedPath?.trim() ? imessageConnectedPath.trim() : IMESSAGE_DEFAULT_CHAT_DB
      );
    }
  }, [isIMessageModalOpen, imessageDeviceName, imessageConnectedPath]);

  const loadIntegrations = useCallback(async () => {
    try {
      const integrationData = await getIntegrations();
      setIntegrations(integrationData);
    } catch (error) {
      setIntegrations([]);
      toast.error(error instanceof Error ? error.message : 'Failed to load integration settings.');
    }
  }, []);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  const integrationList = useMemo(() => integrations ?? [], [integrations]);

  const groupedConnections = useMemo(
    () =>
      new Map<IntegrationType, IntegrationConnection[]>(
        (['google', 'outlook', 'granola', 'imessage'] as IntegrationType[]).map((type) => [
          type,
          integrationList.filter((integration) => integration.type === type),
        ])
      ),
    [integrationList]
  );

  const imessageLocalConnections = useMemo((): IntegrationConnection[] => {
    if (!imessageConnectedPath) {
      return [];
    }
    const displayName = imessageDeviceName.trim() || 'This Mac';
    return [
      {
        id: IMESSAGE_LOCAL_CONNECTION_ID,
        type: 'imessage',
        connected: true,
        connectionStatus: 'active',
        accountEmail: displayName,
        accountLabel: imessageConnectedPath,
        externalAccountId: null,
        connectedAt: null,
        lastValidatedAt: null,
        lastRefreshAt: null,
        lastRefreshAttemptAt: null,
        lastRefreshError: null,
        reauthRequiredAt: null,
        expiresAt: null,
        toolCount: null,
        toolNames: [],
      },
    ];
  }, [imessageConnectedPath, imessageDeviceName]);

  const openProfileDialog = () => {
    setProfileError(null);
    setProfileFirstName(user?.firstName ?? '');
    setProfileLastName(user?.lastName ?? '');
    setSelectedAvatarId(user?.avatarId ?? getAvatarOption(user?.avatarId).id);
    setIsProfileDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!profileFirstName.trim()) {
      setProfileError('A first name is required.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);

    try {
      const profile = await updateCurrentUserProfile({
        firstName: profileFirstName.trim(),
        lastName: profileLastName.trim() || null,
        avatarId: selectedAvatarId,
      });
      setUser(profile);
      await refreshUser();
      toast.success('Profile updated.');
      setIsProfileDialogOpen(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleThemeChange = (next: ThemePreference) => {
    setTheme(next);
    applyTheme(next);
  };

  const handleOAuthConnect = useCallback(
    async (type: OAuthIntegrationType) => {
      if (!window.rolodexDesktop?.startProviderOAuth) {
        toast.error(
          `${INTEGRATION_CONFIGS[type].label} sign-in is only available from the desktop app.`
        );
        return;
      }

      setConnectingType(type);

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
        toast.success(`${INTEGRATION_CONFIGS[type].label} connected.`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to connect ${INTEGRATION_CONFIGS[type].label}.`
        );
      } finally {
        setConnectingType(null);
      }
    },
    [loadIntegrations]
  );

  const handleGranolaConnect = useCallback(async () => {
    if (!window.rolodexDesktop?.startGranolaOAuth) {
      toast.error('Granola sign-in is only available from the desktop app.');
      return;
    }

    setIsGranolaConnecting(true);
    setConnectingType('granola');

    try {
      const oauthResult = await window.rolodexDesktop.startGranolaOAuth();
      await connectGranolaIntegration(oauthResult);
      await loadIntegrations();
      toast.success(`${INTEGRATION_CONFIGS.granola.label} connected.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to connect ${INTEGRATION_CONFIGS.granola.label}.`
      );
    } finally {
      setIsGranolaConnecting(false);
      setConnectingType(null);
    }
  }, [loadIntegrations]);

  const handleDisconnect = useCallback(
    async (connection: IntegrationConnection) => {
      setDisconnectingId(connection.id);

      try {
        await disconnectIntegration(connection.id);
        await loadIntegrations();
        toast.success(`${INTEGRATION_CONFIGS[connection.type].label} disconnected.`);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to disconnect ${INTEGRATION_CONFIGS[connection.type].label}.`
        );
      } finally {
        setDisconnectingId(null);
      }
    },
    [loadIntegrations]
  );

  const handleConnectIMessage = async () => {
    if (!window.rolodexDesktop?.validateIMessagePath) {
      toast.error('iMessage setup is only available from the desktop app.');
      return;
    }

    const name = imessageModalDeviceName.trim() || 'This Mac';

    setIsValidatingIMessagePath(true);

    const pathToValidate = imessageModalPath.trim() || IMESSAGE_DEFAULT_CHAT_DB;

    try {
      const result = await window.rolodexDesktop.validateIMessagePath(pathToValidate);
      if (!result.valid) {
        throw new Error('Unable to validate the Messages database path.');
      }

      window.localStorage.setItem(IMESSAGE_PATH_KEY, result.path);
      window.localStorage.setItem(IMESSAGE_DEVICE_NAME_KEY, name);
      setIMessageConnectedPath(result.path);
      setImessageDeviceName(name);
      setIsIMessageModalOpen(false);
      toast.success('iMessage connected on this Mac.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to validate the Messages database path.'
      );
    } finally {
      setIsValidatingIMessagePath(false);
    }
  };

  const handleDisconnectIMessage = useCallback(() => {
    window.localStorage.removeItem(IMESSAGE_PATH_KEY);
    window.localStorage.removeItem(IMESSAGE_DEVICE_NAME_KEY);
    setIMessageConnectedPath(null);
    setImessageDeviceName('');
    toast.success('iMessage disconnected.');
  }, []);

  const integrationRows = useMemo<IntegrationsTableRow[]>(
    () => [
      {
        type: 'google',
        meta: {
          label: 'Google',
          logo: providerMeta.google.logo,
        },
        connections: groupedConnections.get('google') ?? [],
        isBusy:
          connectingType === 'google' ||
          integrationList.some((item) => item.id === disconnectingId),
        manageLabel: 'Connect',
        onManage: () => void handleOAuthConnect('google'),
        onDisconnect: (connection: IntegrationConnection) => void handleDisconnect(connection),
      },
      {
        type: 'outlook',
        meta: {
          label: 'Outlook',
          logo: providerMeta.outlook.logo,
        },
        connections: groupedConnections.get('outlook') ?? [],
        isBusy:
          connectingType === 'outlook' ||
          integrationList.some((item) => item.id === disconnectingId),
        manageLabel: 'Connect',
        onManage: () => void handleOAuthConnect('outlook'),
        onDisconnect: (connection: IntegrationConnection) => void handleDisconnect(connection),
      },
      {
        type: 'granola',
        meta: {
          label: 'Granola',
          logo: providerMeta.granola.logo,
        },
        connections: groupedConnections.get('granola') ?? [],
        isBusy:
          isGranolaConnecting ||
          connectingType === 'granola' ||
          integrationList.some((item) => item.id === disconnectingId),
        manageLabel: 'Connect',
        onManage: () => void handleGranolaConnect(),
        onDisconnect: (connection: IntegrationConnection) => void handleDisconnect(connection),
      },
      {
        type: 'imessage',
        meta: {
          label: 'iMessage',
          logo: providerMeta.imessage.logo,
        },
        connections: imessageLocalConnections,
        isBusy: isValidatingIMessagePath,
        manageLabel: runnerSupported ? (imessageConnectedPath ? 'Edit' : 'Connect') : 'Unavailable',
        manageDisabled: !runnerSupported,
        summaryLabel: imessageConnectedPath ? '1' : 'Not Connected',
        statusOverride: imessageConnectedPath
          ? {
              label: 'Connected',
              className:
                'border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300',
            }
          : {
              label: 'Not Connected',
              className:
                'border-border bg-muted/80 text-muted-foreground dark:bg-muted/50 dark:text-muted-foreground',
            },
        emptyState: runnerSupported
          ? 'No accounts connected yet.'
          : `The Messages runner is only supported on macOS (this device reports ${desktopPlatform}).`,
        onManage: () => setIsIMessageModalOpen(true),
        onDisconnect: () => {
          handleDisconnectIMessage();
        },
      },
    ],
    [
      connectingType,
      desktopPlatform,
      disconnectingId,
      groupedConnections,
      handleDisconnect,
      handleDisconnectIMessage,
      handleGranolaConnect,
      handleOAuthConnect,
      imessageConnectedPath,
      imessageDeviceName,
      imessageLocalConnections,
      integrationList,
      isGranolaConnecting,
      isValidatingIMessagePath,
      runnerSupported,
    ]
  );

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-2 pb-10 pt-4 sm:px-3">
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Settings</h1>

          <div className="mt-5 space-y-6">
            <section className="space-y-4">
              <div className="overflow-hidden rounded-[1.25rem] border border-border bg-card">
                <div className="flex flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
                  <div className="min-w-0 space-y-4">
                    <div>
                      <div className="text-3xl font-semibold tracking-tight text-foreground">
                        {profileDisplayName}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">{user?.email}</div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={openProfileDialog}>
                      Edit Profile
                    </Button>
                  </div>
                  <img
                    src={getAvatarOption(user?.avatarId).src}
                    alt={getAvatarOption(user?.avatarId).label}
                    className="mx-auto size-28 shrink-0 rounded-[1.5rem] bg-transparent object-cover filter-[drop-shadow(0_12px_28px_rgba(15,23,42,0.14))] dark:filter-[drop-shadow(0_18px_40px_rgba(0,0,0,0.55))] sm:mx-0"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Appearance</h2>
              <SettingsRow label="Theme">
                <div
                  className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 sm:ml-auto"
                  role="group"
                  aria-label="Theme"
                >
                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      theme === 'light'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Sun className="size-3.5" />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      theme === 'dark'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Moon className="size-3.5" />
                    Dark
                  </button>
                </div>
              </SettingsRow>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Integrations</h2>
              <IntegrationsTable rows={integrationRows} isLoading={integrations === null} />
            </section>
          </div>
        </div>
      </div>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {profileError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {profileError}
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">First Name</label>
              <Input
                value={profileFirstName}
                onChange={(event) => setProfileFirstName(event.target.value)}
                placeholder="Your first name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Last Name</label>
              <Input
                value={profileLastName}
                onChange={(event) => setProfileLastName(event.target.value)}
                placeholder="Your last name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
              <Input value={user?.email ?? ''} disabled className="bg-muted" />
            </div>

            <div>
              <div className="mb-3 text-sm font-medium text-foreground">Avatar</div>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {AVATAR_OPTIONS.map((avatar) => {
                  const selected = avatar.id === selectedAvatarId;

                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatarId(avatar.id)}
                      className="group flex justify-center rounded-full p-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/20 dark:focus-visible:ring-ring/50"
                      aria-label={avatar.label}
                      aria-pressed={selected}
                    >
                      <div
                        className={cn(
                          'w-full max-w-26 overflow-hidden rounded-full bg-white transition-all dark:bg-card',
                          selected
                            ? 'ring-4 ring-stone-950 shadow-lg shadow-stone-900/20 dark:ring-foreground dark:shadow-lg dark:shadow-black/50'
                            : 'ring-1 ring-black/10 group-hover:ring-stone-400 hover:ring-4 dark:ring-border dark:group-hover:ring-muted-foreground'
                        )}
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={isSavingProfile || !profileFirstName.trim()}
              >
                {isSavingProfile ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isIMessageModalOpen} onOpenChange={setIsIMessageModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect iMessage on this Mac</DialogTitle>
            <DialogDescription>
              Rolodex cannot turn on Full Disk Access for itself — macOS requires you to enable it
              in System Settings. We copy <code className="text-xs">chat.db</code> to a temp file to
              verify access (direct reads are often blocked until FDA is granted).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Messages database path
              </label>
              <Input
                value={imessageModalPath}
                onChange={(event) => setImessageModalPath(event.target.value)}
                placeholder={IMESSAGE_DEFAULT_CHAT_DB}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Device name</label>
              <Input
                value={imessageModalDeviceName}
                onChange={(event) => setImessageModalDeviceName(event.target.value)}
                placeholder="e.g. Work MacBook Pro"
              />
            </div>

            <div className="rounded-xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
              Default path is <code className="text-xs">~/Library/Messages/chat.db</code>. If
              Connect says the file is missing but it exists in Finder, use Full Disk Access (button
              below), add <span className="font-medium text-foreground">Rolodex</span>, turn it on,
              quit and reopen Rolodex, then try again.
            </div>

            {runnerSupported ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void window.rolodexDesktop?.openFullDiskAccessSettings?.()}
              >
                Open Full Disk Access settings…
              </Button>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsIMessageModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleConnectIMessage()}
                disabled={!runnerSupported || isValidatingIMessagePath || !imessageModalPath.trim()}
              >
                {isValidatingIMessagePath ? 'Checking...' : 'Connect'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
