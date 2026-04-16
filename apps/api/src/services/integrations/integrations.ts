import { IntegrationConnectionStatus, IntegrationProvider, Prisma, prisma } from '@rolodex/db';
import type {
  ConnectGranolaIntegrationRequest,
  ConnectOAuthIntegrationRequest,
  IntegrationConnectionStatus as IntegrationConnectionStatusType,
  IntegrationConnection,
  IntegrationType,
  OAuthIntegrationType,
} from '@rolodex/types';
import { createAppError } from '../../utils/errors';
import { encryptIntegrationToken } from './credentials';
import { refreshStoredIntegrationTokens } from './tokenManager';

const GRANOLA_MCP_URL = 'https://mcp.granola.ai/mcp';
const MCP_PROTOCOL_VERSION = '2025-03-26';

const integrationTypeToProvider: Record<IntegrationType, IntegrationProvider> = {
  imessage: IntegrationProvider.IMESSAGE,
  google: IntegrationProvider.GOOGLE,
  outlook: IntegrationProvider.OUTLOOK,
  granola: IntegrationProvider.GRANOLA,
};

const providerToIntegrationType: Record<IntegrationProvider, IntegrationType> = {
  [IntegrationProvider.IMESSAGE]: 'imessage',
  [IntegrationProvider.GOOGLE]: 'google',
  [IntegrationProvider.OUTLOOK]: 'outlook',
  [IntegrationProvider.GRANOLA]: 'granola',
};

const oauthIntegrationLabels: Record<OAuthIntegrationType, string> = {
  google: 'Google',
  outlook: 'Outlook',
};

const providerToConnectionStatus: Record<
  IntegrationConnectionStatus,
  IntegrationConnectionStatusType
> = {
  [IntegrationConnectionStatus.ACTIVE]: 'active',
  [IntegrationConnectionStatus.REFRESH_FAILED]: 'refresh_failed',
  [IntegrationConnectionStatus.RECONNECT_REQUIRED]: 'reconnect_required',
};

const sanitizeIntegration = (integration: {
  id: string;
  provider: IntegrationProvider;
  externalAccountId: string | null;
  connectedAt: Date | null;
  lastValidatedAt: Date | null;
  lastRefreshAt: Date | null;
  lastRefreshAttemptAt: Date | null;
  lastRefreshError: string | null;
  reauthRequiredAt: Date | null;
  tokenExpiresAt: Date | null;
  connectionStatus: IntegrationConnectionStatus;
  accountLabel: string | null;
  accountEmail: string | null;
  metadata: Prisma.JsonValue;
  disconnectedAt: Date | null;
}): IntegrationConnection => {
  const metadata =
    integration.metadata &&
    typeof integration.metadata === 'object' &&
    !Array.isArray(integration.metadata)
      ? (integration.metadata as { toolCount?: number; toolNames?: string[] })
      : {};

  return {
    id: integration.id,
    type: providerToIntegrationType[integration.provider],
    connected: integration.disconnectedAt === null,
    connectionStatus: providerToConnectionStatus[integration.connectionStatus],
    externalAccountId: integration.externalAccountId,
    connectedAt: integration.connectedAt?.toISOString() ?? null,
    lastValidatedAt: integration.lastValidatedAt?.toISOString() ?? null,
    lastRefreshAt: integration.lastRefreshAt?.toISOString() ?? null,
    lastRefreshAttemptAt: integration.lastRefreshAttemptAt?.toISOString() ?? null,
    lastRefreshError: integration.lastRefreshError,
    reauthRequiredAt: integration.reauthRequiredAt?.toISOString() ?? null,
    expiresAt: integration.tokenExpiresAt?.toISOString() ?? null,
    accountLabel: integration.accountLabel,
    accountEmail: integration.accountEmail,
    toolCount: typeof metadata.toolCount === 'number' ? metadata.toolCount : null,
    toolNames: Array.isArray(metadata.toolNames) ? metadata.toolNames : [],
  };
};

type McpJsonRpcResponse<T> = {
  error?: {
    code: number;
    message: string;
  };
  id?: number | string | null;
  result?: T;
};

const parseMcpResponse = async <T>(response: Response): Promise<McpJsonRpcResponse<T>> => {
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  if (!body) {
    return {};
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(body) as McpJsonRpcResponse<T>;
  }

  const dataLines = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);

  if (dataLines.length === 0) {
    throw createAppError('Granola MCP returned an unexpected response.', 502);
  }

  return JSON.parse(dataLines[dataLines.length - 1]) as McpJsonRpcResponse<T>;
};

const postMcpRequest = async <T>(
  accessToken: string,
  body: Record<string, unknown>,
  sessionId?: string
) => {
  const response = await fetch(GRANOLA_MCP_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
      ...(sessionId ? { 'MCP-Session-Id': sessionId } : {}),
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    throw createAppError('Granola authentication failed. Reconnect your account.', 401);
  }

  if (!response.ok) {
    throw createAppError(`Granola MCP request failed with HTTP ${response.status}.`, 502);
  }

  return {
    sessionId: response.headers.get('MCP-Session-Id') || sessionId || undefined,
    payload: await parseMcpResponse<T>(response),
  };
};

const validateGranolaAccess = async (accessToken: string) => {
  const initializeResponse = await postMcpRequest<{
    capabilities?: {
      tools?: Record<string, never>;
    };
    protocolVersion?: string;
    serverInfo?: {
      name?: string;
      version?: string;
    };
  }>(accessToken, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: 'Rolodex',
        version: '0.1.0',
      },
    },
  });

  if (initializeResponse.payload.error) {
    throw createAppError(
      initializeResponse.payload.error.message || 'Granola rejected the MCP session.',
      502
    );
  }

  if (!initializeResponse.payload.result) {
    throw createAppError('Granola did not return MCP initialization data.', 502);
  }

  await postMcpRequest<null>(
    accessToken,
    {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    },
    initializeResponse.sessionId
  );

  const toolsResponse = await postMcpRequest<{
    tools?: Array<{
      description?: string;
      name: string;
    }>;
  }>(
    accessToken,
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    },
    initializeResponse.sessionId
  );

  if (toolsResponse.payload.error) {
    throw createAppError(
      toolsResponse.payload.error.message || 'Granola tools are unavailable for this account.',
      502
    );
  }

  const tools = toolsResponse.payload.result?.tools ?? [];

  return {
    toolCount: tools.length,
    toolNames: tools.map((tool) => tool.name),
  };
};

const refreshGranolaMetadata = async (accessToken: string, clientId?: string | null) => {
  const metadata = await validateGranolaAccess(accessToken);

  return {
    ...metadata,
    ...(clientId ? { oauthClientId: clientId } : {}),
  };
};

export const listUserIntegrations = async (userId: string): Promise<IntegrationConnection[]> => {
  const integrations = await prisma.userIntegration.findMany({
    where: {
      userId,
      disconnectedAt: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const refreshedIntegrations = await Promise.all(
    integrations.map(async (integration) => {
      try {
        return await refreshStoredIntegrationTokens(integration, {
          onGranolaRefreshed:
            integration.provider === IntegrationProvider.GRANOLA
              ? async (accessToken, currentIntegration) => ({
                  metadata: await refreshGranolaMetadata(
                    accessToken,
                    currentIntegration.metadata &&
                      typeof currentIntegration.metadata === 'object' &&
                      !Array.isArray(currentIntegration.metadata)
                      ? ((currentIntegration.metadata as { oauthClientId?: unknown })
                          .oauthClientId as string | undefined)
                      : undefined
                  ),
                  lastValidatedAt: new Date(),
                })
              : undefined,
        });
      } catch {
        return prisma.userIntegration.findUniqueOrThrow({
          where: { id: integration.id },
        });
      }
    })
  );

  return refreshedIntegrations.map((integration) =>
    sanitizeIntegration(integration as Parameters<typeof sanitizeIntegration>[0])
  );
};

export const connectGranolaIntegration = async (
  userId: string,
  input: ConnectGranolaIntegrationRequest
): Promise<IntegrationConnection> => {
  if (!input.accessToken?.trim()) {
    throw createAppError('Granola access token is required.', 400);
  }

  if (!input.clientId?.trim()) {
    throw createAppError('Granola client identifier is required.', 400);
  }

  const metadata = await refreshGranolaMetadata(input.accessToken, input.clientId);
  const now = new Date();

  const externalAccountId = input.externalAccountId?.trim() || null;
  const accountEmail = input.accountEmail?.trim() || null;
  const accountLabel = input.accountLabel?.trim() || accountEmail || 'Granola';

  const existing = externalAccountId
    ? await prisma.userIntegration.findFirst({
        where: {
          userId,
          provider: IntegrationProvider.GRANOLA,
          externalAccountId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    : await prisma.userIntegration.findFirst({
        where: {
          userId,
          provider: IntegrationProvider.GRANOLA,
          disconnectedAt: null,
        },
      });

  const data = {
    externalAccountId,
    accountEmail,
    accountLabel,
    accessToken: encryptIntegrationToken(input.accessToken),
    refreshToken: encryptIntegrationToken(input.refreshToken || null),
    tokenScope: input.scope || null,
    tokenExpiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    connectedAt: now,
    lastValidatedAt: now,
    connectionStatus: IntegrationConnectionStatus.ACTIVE,
    lastRefreshError: null,
    reauthRequiredAt: null,
    disconnectedAt: null,
    metadata,
  } satisfies Prisma.UserIntegrationUncheckedUpdateInput;

  const integration = existing
    ? await prisma.userIntegration.update({
        where: {
          id: existing.id,
        },
        data,
      })
    : await prisma.userIntegration.create({
        data: {
          userId,
          provider: IntegrationProvider.GRANOLA,
          ...data,
        },
      });

  return sanitizeIntegration(integration);
};

export const connectOAuthIntegration = async (
  userId: string,
  type: OAuthIntegrationType,
  input: ConnectOAuthIntegrationRequest
): Promise<IntegrationConnection> => {
  const provider = integrationTypeToProvider[type];

  if (provider !== IntegrationProvider.GOOGLE && provider !== IntegrationProvider.OUTLOOK) {
    throw createAppError('Unsupported OAuth integration type.', 400);
  }

  if (!input.accessToken?.trim()) {
    throw createAppError(`${oauthIntegrationLabels[type]} access token is required.`, 400);
  }

  const now = new Date();
  const externalAccountId = input.externalAccountId?.trim() || null;
  if (!externalAccountId) {
    throw createAppError(`${oauthIntegrationLabels[type]} account identifier is required.`, 400);
  }
  const accountEmail = input.accountEmail?.trim() || null;
  const accountLabel = input.accountLabel?.trim() || accountEmail || oauthIntegrationLabels[type];
  const existing = externalAccountId
    ? await prisma.userIntegration.findFirst({
        where: {
          userId,
          provider,
          externalAccountId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    : null;

  const data = {
    externalAccountId,
    accountLabel,
    accountEmail,
    accessToken: encryptIntegrationToken(input.accessToken),
    refreshToken: encryptIntegrationToken(input.refreshToken || null),
    tokenScope: input.scope || null,
    tokenExpiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    connectedAt: now,
    lastValidatedAt: now,
    connectionStatus: IntegrationConnectionStatus.ACTIVE,
    lastRefreshError: null,
    reauthRequiredAt: null,
    disconnectedAt: null,
  } satisfies Prisma.UserIntegrationUncheckedUpdateInput;

  const integration = existing
    ? await prisma.userIntegration.update({
        where: {
          id: existing.id,
        },
        data,
      })
    : await prisma.userIntegration.create({
        data: {
          userId,
          provider,
          ...data,
        },
      });

  return sanitizeIntegration(integration);
};

export const disconnectUserIntegration = async (userId: string, integrationId: string) => {
  const existing = await prisma.userIntegration.findFirst({
    where: {
      userId,
      id: integrationId,
      disconnectedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw createAppError('Integration not found.', 404);
  }

  await prisma.userIntegration.update({
    where: {
      id: existing.id,
    },
    data: {
      accessToken: null,
      refreshToken: null,
      tokenScope: null,
      tokenExpiresAt: null,
      connectionStatus: IntegrationConnectionStatus.ACTIVE,
      lastRefreshAt: null,
      lastRefreshAttemptAt: null,
      lastRefreshError: null,
      reauthRequiredAt: null,
      metadata: Prisma.JsonNull,
      disconnectedAt: new Date(),
    },
  });
};
