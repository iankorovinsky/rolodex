import type { GranolaOAuthResult } from '@rolodex/types';

export {};

declare global {
  interface Window {
    rolodexDesktop?: {
      platform: NodeJS.Platform;
      runnerSupported: boolean;
      startGranolaOAuth: () => Promise<GranolaOAuthResult>;
    };
  }
}
