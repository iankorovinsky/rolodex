export const INTEGRATION_TYPES = [
  'google_calendar',
  'gmail',
  'outlook',
  'whatsapp',
  'linkedin',
  'messages',
] as const;

export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  email?: string;
  connected: boolean;
  connectedAt?: string;
}

export interface IntegrationConfig {
  type: IntegrationType;
  label: string;
  description: string;
  icon: string;
  color: string;
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
  google_calendar: {
    type: 'google_calendar',
    label: 'Google Calendar',
    description: 'Sync your Google Calendar events',
    icon: 'calendar',
    color: '#4285F4',
  },
  gmail: {
    type: 'gmail',
    label: 'Gmail',
    description: 'Connect your Gmail inbox',
    icon: 'mail',
    color: '#EA4335',
  },
  outlook: {
    type: 'outlook',
    label: 'Outlook',
    description: 'Sync Outlook email and calendar',
    icon: 'mail',
    color: '#0078D4',
  },
  whatsapp: {
    type: 'whatsapp',
    label: 'WhatsApp',
    description: 'Connect your WhatsApp messages',
    icon: 'message-circle',
    color: '#25D366',
  },
  linkedin: {
    type: 'linkedin',
    label: 'LinkedIn',
    description: 'Sync your LinkedIn messages and connections',
    icon: 'linkedin',
    color: '#0A66C2',
  },
  messages: {
    type: 'messages',
    label: 'Messages',
    description: 'Connect Apple Messages',
    icon: 'message-square',
    color: '#34C759',
  },
};
