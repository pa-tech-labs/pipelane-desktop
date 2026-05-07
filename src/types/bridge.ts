export interface PipelaneNotificationOpts {
  title: string;
  body: string;
  data?: unknown;
}

export interface PipelaneDesktopBridge {
  isDesktop: true;
  version: string;
  platform: NodeJS.Platform;
  notify(opts: PipelaneNotificationOpts): void;
  onNotificationClick(handler: (data: unknown) => void): () => void;
  setBadgeCount(count: number): void;
}

declare global {
  interface Window {
    pipelaneDesktop?: PipelaneDesktopBridge;
  }
}
