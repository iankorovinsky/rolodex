import { IntegrationConnectionStatus, IntegrationProvider, Prisma, prisma } from '@rolodex/db';
import { createAppError } from '../../utils/errors';
import { decryptIntegrationToken, encryptIntegrationToken } from './credentials';

const GRANOLA_AUTH_METADATA_URL = 'https://mcp.granola.ai/.well-known/oauth-authorization-server';
const GRANOLA_MCP_RESOURCE = 'https://mcp.granola.ai/mcp';
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

type IntegrationRecord = {
  id: string;
  provider: IntegrationProvider;
  accessToken: string | null;
  refreshToken: string | null;
  tokenScope: string | null;
  tokenExpiresAt: Date | null;
  metadata: Prisma.JsonValue;
  connectionStatus: IntegrationConnectionStatus;
  disconnectedAt: Date | null;
};

type RefreshedTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  tokenScope: string | null;
};

type TokenRefreshFailureKind = 'reauth_required' | 'transient';

class TokenRefreshError extends Error {
  kind: TokenRefreshFailureKind;

  constructor(message: string, kind: TokenRefreshFailureKind) {
    super(message);
    this.name = 'TokenRefreshError';
    this.kind = kind;
  }
}

type OAuthErrorResponse = {
  error?: string;
  error_description?: string;
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  scope?: string;
};

const formatProviderError = (
  fallbackMessage: string,
  payload: OAuthErrorResponse | null,
  status: number
) => {
  const parts = [payload?.error_description, payload?.error].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(': ');
  }

  return `${fallbackMessage} (HTTP ${status}).`;
};

const isReauthError = (payload: OAuthErrorResponse | null, status: number) => {
  const error = payload?.error?.toLowerCase();

  if (error === 'invalid_grant' || error === 'invalid_client' || error === 'unauthorized_client') {
    return true;
  }

  return status === 400 || status === 401;
};

const fetchTokenResponse = async <T extends OAuthErrorResponse>(
  url: string,
  params: Record<string, string>,
  fallbackMessage: string
): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });
  } catch {
    throw new TokenRefreshError(`${fallbackMessage} Network request failed.`, 'transient');
  }

  const contentType = response.headers.get('content-type') || '';
  const bodyText = await response.text();
  const payload =
    bodyText && contentType.includes('application/json')
      ? (JSON.parse(bodyText) as T)
      : bodyText
        ? ({ error_description: bodyText } as T)
        : null;

  if (!response.ok) {
    throw new TokenRefreshError(
      formatProviderError(fallbackMessage, payload, response.status),
      isReauthError(payload, response.status) ? 'reauth_required' : 'transient'
    );
  }

  return (payload ?? {}) as T;
};

const getGranolaClientId = (metadata: Prisma.JsonValue) => {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const clientId = (metadata as { oauthClientId?: unknown }).oauthClientId;
    if (typeof clientId === 'string' && clientId.trim()) {
      return clientId;
    }
  }

  return null;
};

const getNextExpiry = (expiresIn?: number) =>
  typeof expiresIn === 'number' && Number.isFinite(expiresIn)
    ? new Date(Date.now() + expiresIn * 1000)
    : null;

const refreshGoogleTokens = async (integration: IntegrationRecord, refreshToken: string) => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();

  if (!clientId) {
    throw createAppError('Missing GOOGLE_OAUTH_CLIENT_ID.', 500);
  }

  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const payload = await fetchTokenResponse<OAuthErrorResponse>(
    'https://oauth2.googleapis.com/token',
    {
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
    'Google token refresh failed.'
  );

  if (!payload.access_token) {
    throw new TokenRefreshError(
      'Google token refresh did not return an access token.',
      'transient'
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || refreshToken,
    tokenExpiresAt: getNextExpiry(payload.expires_in),
    tokenScope: payload.scope || integration.tokenScope,
  } satisfies RefreshedTokenSet;
};

const refreshMicrosoftTokens = async (integration: IntegrationRecord, refreshToken: string) => {
  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID?.trim();

  if (!clientId) {
    throw createAppError('Missing MICROSOFT_OAUTH_CLIENT_ID.', 500);
  }

  const tenantId = process.env.MICROSOFT_OAUTH_TENANT_ID?.trim() || 'common';
  const payload = await fetchTokenResponse<OAuthErrorResponse>(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
    'Microsoft token refresh failed.'
  );

  if (!payload.access_token) {
    throw new TokenRefreshError(
      'Microsoft token refresh did not return an access token.',
      'transient'
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || refreshToken,
    tokenExpiresAt: getNextExpiry(payload.expires_in),
    tokenScope: payload.scope || integration.tokenScope,
  } satisfies RefreshedTokenSet;
};

const refreshGranolaTokens = async (integration: IntegrationRecord, refreshToken: string) => {
  const clientId = getGranolaClientId(integration.metadata);

  if (!clientId) {
    throw new TokenRefreshError(
      'Granola refresh is missing the registered client id.',
      'reauth_required'
    );
  }

  let authMetadata: { token_endpoint: string };

  try {
    const response = await fetch(GRANOLA_AUTH_METADATA_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    authMetadata = (await response.json()) as { token_endpoint: string };
  } catch {
    throw new TokenRefreshError('Granola authorization metadata could not be loaded.', 'transient');
  }

  const payload = await fetchTokenResponse<OAuthErrorResponse>(
    authMetadata.token_endpoint,
    {
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      resource: GRANOLA_MCP_RESOURCE,
    },
    'Granola token refresh failed.'
  );

  if (!payload.access_token) {
    throw new TokenRefreshError(
      'Granola token refresh did not return an access token.',
      'transient'
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || refreshToken,
    tokenExpiresAt: getNextExpiry(payload.expires_in),
    tokenScope: payload.scope || integration.tokenScope,
  } satisfies RefreshedTokenSet;
};

const shouldRefresh = (integration: IntegrationRecord, minTtlSeconds = 0) => {
  if (!integration.tokenExpiresAt) {
    return false;
  }

  const threshold = Math.max(minTtlSeconds * 1000, REFRESH_THRESHOLD_MS);
  return integration.tokenExpiresAt.getTime() <= Date.now() + threshold;
};

const markRefreshFailure = async (integrationId: string, error: TokenRefreshError) => {
  const now = new Date();

  await prisma.userIntegration.update({
    where: { id: integrationId },
    data: {
      connectionStatus:
        error.kind === 'reauth_required'
          ? IntegrationConnectionStatus.RECONNECT_REQUIRED
          : IntegrationConnectionStatus.REFRESH_FAILED,
      lastRefreshAttemptAt: now,
      lastRefreshError: error.message,
      reauthRequiredAt: error.kind === 'reauth_required' ? now : null,
    },
  });
};

const persistRefreshedTokens = async <T extends IntegrationRecord>(
  integration: T,
  refreshed: RefreshedTokenSet,
  options?: {
    lastValidatedAt?: Date | null;
    metadata?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  }
): Promise<T> => {
  const now = new Date();

  return prisma.userIntegration.update({
    where: { id: integration.id },
    data: {
      accessToken: encryptIntegrationToken(refreshed.accessToken),
      refreshToken: encryptIntegrationToken(refreshed.refreshToken),
      tokenExpiresAt: refreshed.tokenExpiresAt,
      tokenScope: refreshed.tokenScope,
      connectionStatus: IntegrationConnectionStatus.ACTIVE,
      lastRefreshAt: now,
      lastRefreshAttemptAt: now,
      lastRefreshError: null,
      reauthRequiredAt: null,
      ...(options?.lastValidatedAt !== undefined
        ? { lastValidatedAt: options.lastValidatedAt }
        : {}),
      ...(options?.metadata !== undefined ? { metadata: options.metadata } : {}),
    },
  }) as unknown as Promise<T>;
};

export const refreshStoredIntegrationTokens = async <T extends IntegrationRecord>(
  integration: T,
  options?: {
    minTtlSeconds?: number;
    onGranolaRefreshed?: (
      accessToken: string,
      integration: IntegrationRecord
    ) => Promise<{
      metadata?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      lastValidatedAt?: Date | null;
    }>;
  }
): Promise<T> => {
  if (
    integration.disconnectedAt ||
    integration.connectionStatus === IntegrationConnectionStatus.RECONNECT_REQUIRED
  ) {
    return integration;
  }

  if (!shouldRefresh(integration, options?.minTtlSeconds)) {
    return integration;
  }

  const refreshToken = decryptIntegrationToken(integration.refreshToken);

  if (!refreshToken) {
    const error = new TokenRefreshError(
      'Refresh token is missing. Reconnect this account.',
      'reauth_required'
    );
    await markRefreshFailure(integration.id, error);
    throw error;
  }

  try {
    const refreshed =
      integration.provider === IntegrationProvider.GOOGLE
        ? await refreshGoogleTokens(integration, refreshToken)
        : integration.provider === IntegrationProvider.OUTLOOK
          ? await refreshMicrosoftTokens(integration, refreshToken)
          : await refreshGranolaTokens(integration, refreshToken);

    const granolaUpdate =
      integration.provider === IntegrationProvider.GRANOLA && options?.onGranolaRefreshed
        ? await options.onGranolaRefreshed(refreshed.accessToken, integration)
        : undefined;

    return persistRefreshedTokens(integration, refreshed, granolaUpdate);
  } catch (error) {
    if (error instanceof TokenRefreshError) {
      await markRefreshFailure(integration.id, error);
    }

    throw error;
  }
};

export const getValidAccessToken = async (integrationId: string, minTtlSeconds = 0) => {
  const integration = await prisma.userIntegration.findUnique({
    where: { id: integrationId },
    select: {
      id: true,
      provider: true,
      accessToken: true,
      refreshToken: true,
      tokenScope: true,
      tokenExpiresAt: true,
      metadata: true,
      connectionStatus: true,
      disconnectedAt: true,
    },
  });

  if (!integration || integration.disconnectedAt) {
    throw createAppError('Integration not found.', 404);
  }

  const current = await refreshStoredIntegrationTokens(integration, { minTtlSeconds });
  const accessToken = decryptIntegrationToken(current.accessToken);

  if (!accessToken) {
    throw createAppError('Integration access token is unavailable.', 409);
  }

  return accessToken;
};
