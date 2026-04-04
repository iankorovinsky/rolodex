import { beforeEach, describe, expect, it, mock } from 'bun:test';

mock.module('@rolodex/db', () => {
  const userIntegration = {
    update: mock(),
    findMany: mock(),
    findUnique: mock(),
    findUniqueOrThrow: mock(),
  };

  return {
    IntegrationProvider: {
      GOOGLE: 'GOOGLE',
      OUTLOOK: 'OUTLOOK',
      GRANOLA: 'GRANOLA',
      IMESSAGE: 'IMESSAGE',
    },
    IntegrationConnectionStatus: {
      ACTIVE: 'ACTIVE',
      REFRESH_FAILED: 'REFRESH_FAILED',
      RECONNECT_REQUIRED: 'RECONNECT_REQUIRED',
    },
    Prisma: {
      JsonNull: null,
    },
    prisma: {
      userIntegration,
    },
  };
});

import {
  IntegrationConnectionStatus,
  IntegrationProvider,
  prisma,
} from '@rolodex/db';
import { listUserIntegrations } from '../src/services/integrations/integrations';
import { refreshStoredIntegrationTokens } from '../src/services/integrations/tokenManager';

const mockedPrisma = prisma as unknown as {
  userIntegration: {
    update: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
    findUnique: ReturnType<typeof mock>;
    findUniqueOrThrow: ReturnType<typeof mock>;
  };
};

const baseIntegration = {
  id: 'integration-1',
  userId: 'user-1',
  provider: IntegrationProvider.GOOGLE,
  externalAccountId: 'acct-1',
  accountLabel: 'Test Account',
  accountEmail: 'user@example.com',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  tokenScope: 'scope-a',
  tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  connectedAt: new Date('2026-04-02T12:00:00.000Z'),
  lastValidatedAt: new Date('2026-04-02T12:00:00.000Z'),
  connectionStatus: IntegrationConnectionStatus.ACTIVE,
  lastRefreshAt: null,
  lastRefreshAttemptAt: null,
  lastRefreshError: null,
  reauthRequiredAt: null,
  metadata: null,
  createdAt: new Date('2026-04-02T12:00:00.000Z'),
  updatedAt: new Date('2026-04-02T12:00:00.000Z'),
  disconnectedAt: null,
};

describe('integration refresh', () => {
  beforeEach(() => {
    mockedPrisma.userIntegration.update.mockReset();
    mockedPrisma.userIntegration.findMany.mockReset();
    mockedPrisma.userIntegration.findUnique.mockReset();
    mockedPrisma.userIntegration.findUniqueOrThrow.mockReset();
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'google-client-secret';
    process.env.MICROSOFT_OAUTH_CLIENT_ID = 'microsoft-client-id';
    process.env.MICROSOFT_OAUTH_TENANT_ID = 'common';
    process.env.INTEGRATIONS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    global.fetch = mock() as typeof fetch;
  });

  it('does not refresh a valid Google token before the threshold', async () => {
    const result = await refreshStoredIntegrationTokens({
      ...baseIntegration,
      tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: baseIntegration.id,
        tokenExpiresAt: expect.any(Date),
      })
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockedPrisma.userIntegration.update).not.toHaveBeenCalled();
  });

  it('refreshes an expiring Outlook token and persists a rotated refresh token', async () => {
    const refreshedRow = {
      ...baseIntegration,
      provider: IntegrationProvider.OUTLOOK,
      accessToken: 'enc:updated-access',
      refreshToken: 'enc:updated-refresh',
      tokenExpiresAt: new Date('2026-04-02T13:00:00.000Z'),
      lastRefreshAt: new Date('2026-04-02T12:30:00.000Z'),
      lastRefreshAttemptAt: new Date('2026-04-02T12:30:00.000Z'),
      updatedAt: new Date('2026-04-02T12:30:00.000Z'),
    };

    (global.fetch as ReturnType<typeof mock>).mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      text: async () =>
        JSON.stringify({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 1800,
          scope: 'scope-b',
        }),
    });
    mockedPrisma.userIntegration.update.mockResolvedValue(refreshedRow);

    const result = await refreshStoredIntegrationTokens({
      ...baseIntegration,
      provider: IntegrationProvider.OUTLOOK,
      tokenExpiresAt: new Date(Date.now() + 60 * 1000),
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.userIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: baseIntegration.id },
        data: expect.objectContaining({
          connectionStatus: IntegrationConnectionStatus.ACTIVE,
          accessToken: expect.stringMatching(/^enc:/),
          refreshToken: expect.stringMatching(/^enc:/),
          tokenScope: 'scope-b',
        }),
      })
    );
    expect(result.refreshToken).toBe('enc:updated-refresh');
  });

  it('refreshes Granola and updates metadata through the callback', async () => {
    const refreshedRow = {
      ...baseIntegration,
      provider: IntegrationProvider.GRANOLA,
      metadata: {
        oauthClientId: 'granola-client-id',
        toolCount: 5,
        toolNames: ['summarize'],
      },
      lastValidatedAt: new Date('2026-04-02T12:45:00.000Z'),
      lastRefreshAt: new Date('2026-04-02T12:45:00.000Z'),
      lastRefreshAttemptAt: new Date('2026-04-02T12:45:00.000Z'),
    };

    (global.fetch as ReturnType<typeof mock>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token_endpoint: 'https://granola.example/token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () =>
          JSON.stringify({
            access_token: 'granola-new-access',
            refresh_token: 'granola-new-refresh',
            expires_in: 1800,
            scope: 'openid profile email offline_access',
          }),
      });
    mockedPrisma.userIntegration.update.mockResolvedValue(refreshedRow);

    await refreshStoredIntegrationTokens(
      {
        ...baseIntegration,
        provider: IntegrationProvider.GRANOLA,
        metadata: { oauthClientId: 'granola-client-id' },
        tokenExpiresAt: new Date(Date.now() + 60 * 1000),
      },
      {
        onGranolaRefreshed: async () => ({
          metadata: {
            oauthClientId: 'granola-client-id',
            toolCount: 5,
            toolNames: ['summarize'],
          },
          lastValidatedAt: new Date('2026-04-02T12:45:00.000Z'),
        }),
      }
    );

    expect(mockedPrisma.userIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: {
            oauthClientId: 'granola-client-id',
            toolCount: 5,
            toolNames: ['summarize'],
          },
          lastValidatedAt: new Date('2026-04-02T12:45:00.000Z'),
        }),
      })
    );
  });

  it('marks the connection as reconnect required when the refresh token is missing', async () => {
    mockedPrisma.userIntegration.update.mockResolvedValue({
      ...baseIntegration,
      connectionStatus: IntegrationConnectionStatus.RECONNECT_REQUIRED,
      reauthRequiredAt: new Date('2026-04-02T12:00:00.000Z'),
      lastRefreshAttemptAt: new Date('2026-04-02T12:00:00.000Z'),
      lastRefreshError: 'Refresh token is missing. Reconnect this account.',
    });

    await expect(
      refreshStoredIntegrationTokens({
        ...baseIntegration,
        refreshToken: null,
        tokenExpiresAt: new Date(Date.now() - 60 * 1000),
      })
    ).rejects.toThrow('Refresh token is missing. Reconnect this account.');

    expect(mockedPrisma.userIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          connectionStatus: IntegrationConnectionStatus.RECONNECT_REQUIRED,
          reauthRequiredAt: expect.any(Date),
        }),
      })
    );
  });

  it('marks the connection as refresh failed on transient provider errors', async () => {
    (global.fetch as ReturnType<typeof mock>).mockResolvedValue({
      ok: false,
      status: 503,
      headers: {
        get: () => 'application/json',
      },
      text: async () => JSON.stringify({ error: 'server_error', error_description: 'try later' }),
    });
    mockedPrisma.userIntegration.update.mockResolvedValue({
      ...baseIntegration,
      connectionStatus: IntegrationConnectionStatus.REFRESH_FAILED,
      lastRefreshAttemptAt: new Date('2026-04-02T12:15:00.000Z'),
      lastRefreshError: 'try later: server_error',
    });

    await expect(
      refreshStoredIntegrationTokens({
        ...baseIntegration,
        tokenExpiresAt: new Date(Date.now() + 60 * 1000),
      })
    ).rejects.toThrow('try later: server_error');

    expect(mockedPrisma.userIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          connectionStatus: IntegrationConnectionStatus.REFRESH_FAILED,
          lastRefreshError: 'try later: server_error',
        }),
      })
    );
  });

  it('includes refresh status fields in listed integrations', async () => {
    mockedPrisma.userIntegration.findMany.mockResolvedValue([
      {
        ...baseIntegration,
        connectionStatus: IntegrationConnectionStatus.REFRESH_FAILED,
        lastRefreshAt: new Date('2026-04-02T12:30:00.000Z'),
        lastRefreshAttemptAt: new Date('2026-04-02T12:35:00.000Z'),
        lastRefreshError: 'try later',
        reauthRequiredAt: null,
        tokenExpiresAt: null,
      },
    ]);

    const result = await listUserIntegrations('user-1');

    expect(result).toEqual([
      expect.objectContaining({
        id: baseIntegration.id,
        connectionStatus: 'refresh_failed',
        lastRefreshAt: '2026-04-02T12:30:00.000Z',
        lastRefreshAttemptAt: '2026-04-02T12:35:00.000Z',
        lastRefreshError: 'try later',
      }),
    ]);
  });
});
