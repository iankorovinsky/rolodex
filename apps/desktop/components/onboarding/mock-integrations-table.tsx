'use client';

import type { IntegrationConnection, IntegrationType } from '@rolodex/types';
import {
  IntegrationsTable,
  type IntegrationsTableRow,
} from '@/components/settings/integrations-table';

function noop() {}

const mockGoogle: IntegrationConnection = {
  id: 'mock-google-1',
  type: 'google',
  connected: true,
  connectionStatus: 'active',
  accountEmail: 'ian@rolodex.app',
};

const mockGranola: IntegrationConnection = {
  id: 'mock-granola-1',
  type: 'granola',
  connected: true,
  connectionStatus: 'active',
  accountEmail: 'notes@rolodex.app',
};

const mockIMessage: IntegrationConnection = {
  id: 'mock-imessage-1',
  type: 'imessage',
  connected: true,
  connectionStatus: 'active',
  accountLabel: 'This Mac · Messages',
};

const connectedBadgeClass =
  'border-emerald-500/25 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300';

const mockRows: IntegrationsTableRow[] = [
  {
    type: 'google',
    meta: {
      label: 'Google',
      logo: '/integrations/google.svg',
    },
    connections: [mockGoogle],
    isBusy: false,
    manageLabel: 'Connect',
    onManage: noop,
    onDisconnect: noop,
  },
  {
    type: 'outlook',
    meta: {
      label: 'Outlook',
      logo: '/integrations/outlook.svg',
    },
    connections: [],
    isBusy: false,
    manageLabel: 'Connect',
    onManage: noop,
  },
  {
    type: 'granola',
    meta: {
      label: 'Granola',
      logo: '/integrations/granola.svg',
    },
    connections: [mockGranola],
    isBusy: false,
    manageLabel: 'Connect',
    onManage: noop,
    onDisconnect: noop,
  },
  {
    type: 'imessage',
    meta: {
      label: 'iMessage',
      logo: '/integrations/imessage.svg',
    },
    connections: [mockIMessage],
    isBusy: false,
    manageLabel: 'Edit',
    summaryLabel: '1',
    statusOverride: {
      label: 'Connected',
      className: connectedBadgeClass,
    },
    onManage: noop,
    onDisconnect: noop,
  },
];

const initialOpen: IntegrationType[] = ['google', 'outlook', 'granola', 'imessage'];

export function MockIntegrationsTable() {
  return <IntegrationsTable rows={mockRows} initialOpenRows={initialOpen} />;
}
