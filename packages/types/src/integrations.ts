export const INTEGRATION_TYPES = ['imessage', 'google', 'outlook', 'granola'] as const;

export type IntegrationType = (typeof INTEGRATION_TYPES)[number];
export type OAuthIntegrationType = Extract<IntegrationType, 'google' | 'outlook'>;
export type IntegrationConnectionStatus = 'active' | 'refresh_failed' | 'reconnect_required';

export interface IntegrationConfig {
  type: IntegrationType;
  label: string;
  description: string;
  icon: string;
  color: string;
  comingSoon?: boolean;
}

export interface IntegrationConnection {
  id: string;
  type: IntegrationType;
  connected: boolean;
  connectionStatus: IntegrationConnectionStatus;
  externalAccountId?: string | null;
  connectedAt?: string | null;
  lastValidatedAt?: string | null;
  lastRefreshAt?: string | null;
  lastRefreshAttemptAt?: string | null;
  lastRefreshError?: string | null;
  reauthRequiredAt?: string | null;
  expiresAt?: string | null;
  accountLabel?: string | null;
  accountEmail?: string | null;
  toolCount?: number | null;
  toolNames?: string[];
}

export interface ConnectGranolaIntegrationRequest {
  accessToken: string;
  clientId: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresAt?: string | null;
}

export interface ConnectOAuthIntegrationRequest {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresAt?: string | null;
  externalAccountId?: string | null;
  accountLabel?: string | null;
  accountEmail?: string | null;
}

export interface GranolaOAuthResult {
  accessToken: string;
  clientId: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresAt?: string | null;
}

export interface ProviderOAuthResult {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresAt?: string | null;
  externalAccountId: string;
  accountLabel?: string | null;
  accountEmail?: string | null;
}

export interface UserDeviceToken {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
}

export interface CreateUserDeviceTokenRequest {
  name: string;
}

export interface CreateUserDeviceTokenResponse {
  token: string;
  deviceToken: UserDeviceToken;
}

export interface SyncCursorStatus {
  source: string;
  cursor?: string | null;
  lastSuccessAt?: string | null;
}

export interface IMessageSyncStatus {
  contacts: SyncCursorStatus | null;
  messages: SyncCursorStatus | null;
}

export interface SyncContactsRequest {
  contacts: import('./rolodex').SyncContactPayload[];
}

export interface SyncMessagesRequest {
  messages: import('./rolodex').SyncMessagePayload[];
}

export const INTEGRATION_CONFIGS: Record<IntegrationType, IntegrationConfig> = {
  imessage: {
    type: 'imessage',
    label: 'iMessage',
    description: 'Sync Apple Messages and Contacts from your Mac',
    icon: 'message-square',
    color: '#34C759',
  },
  google: {
    type: 'google',
    label: 'Google',
    description: 'Connect Google Calendar and Gmail',
    icon: 'mail',
    color: '#4285F4',
  },
  outlook: {
    type: 'outlook',
    label: 'Outlook',
    description: 'Connect Outlook email and calendar',
    icon: 'mail',
    color: '#0078D4',
  },
  granola: {
    type: 'granola',
    label: 'Granola',
    description: 'Connect Granola meeting notes over MCP',
    icon: 'notebook-tabs',
    color: '#111827',
  },
};
