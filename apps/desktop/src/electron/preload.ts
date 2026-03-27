import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('rolodexDesktop', {
  platform: process.platform,
  runnerSupported: process.platform === 'darwin',
});
