import { contextBridge, ipcRenderer } from 'electron';
import type { GranolaOAuthResult, OAuthIntegrationType, ProviderOAuthResult } from '@rolodex/types';

contextBridge.exposeInMainWorld('rolodexDesktop', {
  platform: process.platform,
  runnerSupported: process.platform === 'darwin',
  startGranolaOAuth: () =>
    ipcRenderer.invoke('integrations:granola-oauth') as Promise<GranolaOAuthResult>,
  startProviderOAuth: (type: OAuthIntegrationType) =>
    ipcRenderer.invoke('integrations:provider-oauth', type) as Promise<ProviderOAuthResult>,
  validateIMessagePath: (inputPath: string) =>
    ipcRenderer.invoke('integrations:imessage-validate-path', inputPath) as Promise<{
      path: string;
      valid: boolean;
    }>,
  openFullDiskAccessSettings: () =>
    ipcRenderer.invoke('integrations:open-full-disk-access-settings') as Promise<void>,
  prepareOAuthCallback: (options: { failureTitle: string; successTitle: string }) =>
    ipcRenderer.invoke('integrations:prepare-oauth-callback', options) as Promise<{
      callbackId: string;
      redirectUri: string;
    }>,
  completeOAuthCallback: (input: { authUrl: string; callbackId: string }) =>
    ipcRenderer.invoke('integrations:complete-oauth-callback', input) as Promise<{
      code: string;
    }>,
  cancelOAuthCallback: (callbackId: string) =>
    ipcRenderer.invoke('integrations:cancel-oauth-callback', callbackId) as Promise<void>,
});
