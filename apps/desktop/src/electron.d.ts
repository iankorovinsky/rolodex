import type { GranolaOAuthResult, OAuthIntegrationType, ProviderOAuthResult } from '@rolodex/types';

export {};

declare global {
  interface Window {
    rolodexDesktop?: {
      platform: NodeJS.Platform;
      runnerSupported: boolean;
      startGranolaOAuth: () => Promise<GranolaOAuthResult>;
      startProviderOAuth: (type: OAuthIntegrationType) => Promise<ProviderOAuthResult>;
      validateIMessagePath: (inputPath: string) => Promise<{
        path: string;
        valid: boolean;
      }>;
      /** macOS only: opens System Settings → Privacy & Security → Full Disk Access. */
      openFullDiskAccessSettings: () => Promise<void>;
      prepareOAuthCallback: (options: { failureTitle: string; successTitle: string }) => Promise<{
        callbackId: string;
        redirectUri: string;
      }>;
      completeOAuthCallback: (input: { authUrl: string; callbackId: string }) => Promise<{
        code: string;
      }>;
      cancelOAuthCallback: (callbackId: string) => Promise<void>;
    };
  }
}
