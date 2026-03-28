import { IntegrationProvider, Prisma, prisma } from '@rolodex/db';
import type {
  ConnectGranolaIntegrationRequest,
  IntegrationConnection,
  IntegrationType,
} from '@rolodex/types';
import { createAppError } from '../../utils/errors';

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

const sanitizeIntegration = (integration: {
  id: string;
  provider: IntegrationProvider;
  connectedAt: Date | null;
  lastValidatedAt: Date | null;
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
    connectedAt: integration.connectedAt?.toISOString() ?? null,
    lastValidatedAt: integration.lastValidatedAt?.toISOString() ?? null,
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

  return integrations.map(sanitizeIntegration);
};

export const connectGranolaIntegration = async (
  userId: string,
  input: ConnectGranolaIntegrationRequest
): Promise<IntegrationConnection> => {
  if (!input.accessToken?.trim()) {
    throw createAppError('Granola access token is required.', 400);
  }

  const metadata = await validateGranolaAccess(input.accessToken);
  const now = new Date();

  const integration = await prisma.userIntegration.upsert({
    where: {
      userId_provider: {
        userId,
        provider: IntegrationProvider.GRANOLA,
      },
    },
    create: {
      userId,
      provider: IntegrationProvider.GRANOLA,
      accountLabel: 'Granola',
      accessToken: input.accessToken,
      refreshToken: input.refreshToken || null,
      tokenScope: input.scope || null,
      tokenExpiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      connectedAt: now,
      lastValidatedAt: now,
      disconnectedAt: null,
      metadata,
    },
    update: {
      accountLabel: 'Granola',
      accessToken: input.accessToken,
      refreshToken: input.refreshToken || null,
      tokenScope: input.scope || null,
      tokenExpiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      connectedAt: now,
      lastValidatedAt: now,
      disconnectedAt: null,
      metadata,
    },
  });

  return sanitizeIntegration(integration);
};

export const disconnectUserIntegration = async (userId: string, type: IntegrationType) => {
  const provider = integrationTypeToProvider[type];
  if (!provider) {
    throw createAppError('Unsupported integration type.', 400);
  }

  const existing = await prisma.userIntegration.findFirst({
    where: {
      userId,
      provider,
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
      metadata: Prisma.JsonNull,
      disconnectedAt: new Date(),
    },
  });
};
