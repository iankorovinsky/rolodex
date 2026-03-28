import { contextBridge, ipcRenderer } from 'electron';
import type { GranolaOAuthResult } from '@rolodex/types';

contextBridge.exposeInMainWorld('rolodexDesktop', {
  platform: process.platform,
  runnerSupported: process.platform === 'darwin',
  startGranolaOAuth: () =>
    ipcRenderer.invoke('integrations:granola-oauth') as Promise<GranolaOAuthResult>,
});
