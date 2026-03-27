export {};

declare global {
  interface Window {
    rolodexDesktop?: {
      platform: NodeJS.Platform;
      runnerSupported: boolean;
    };
  }
}
