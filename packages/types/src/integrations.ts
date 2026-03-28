export const INTEGRATION_TYPES = ['imessage', 'google', 'outlook', 'granola'] as const;

export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

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
  connectedAt?: string | null;
  lastValidatedAt?: string | null;
  accountLabel?: string | null;
  accountEmail?: string | null;
  toolCount?: number | null;
  toolNames?: string[];
}

export interface ConnectGranolaIntegrationRequest {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresAt?: string | null;
}

export interface GranolaOAuthResult {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresAt?: string | null;
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
    comingSoon: true,
  },
  outlook: {
    type: 'outlook',
    label: 'Outlook',
    description: 'Connect Outlook email and calendar',
    icon: 'mail',
    color: '#0078D4',
    comingSoon: true,
  },
  granola: {
    type: 'granola',
    label: 'Granola',
    description: 'Connect Granola meeting notes over MCP',
    icon: 'notebook-tabs',
    color: '#111827',
  },
};
