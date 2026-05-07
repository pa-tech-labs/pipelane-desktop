import { contextBridge, ipcRenderer } from 'electron';
import type { PipelaneDesktopBridge, PipelaneNotificationOpts } from '../types/bridge';

const versionArg = process.argv.find(a => a.startsWith('--pipelane-version='));
const version = versionArg ? versionArg.split('=')[1] : '0.0.0';

const bridge: PipelaneDesktopBridge = {
  isDesktop: true,
  version,
  platform: process.platform,
  notify(opts: PipelaneNotificationOpts): void {
    ipcRenderer.send('pipelane:notify', opts);
  },
  onNotificationClick(handler: (data: unknown) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown): void => handler(data);
    ipcRenderer.on('pipelane:notification-clicked', listener);
    return () => {
      ipcRenderer.removeListener('pipelane:notification-clicked', listener);
    };
  },
  setBadgeCount(count: number): void {
    ipcRenderer.send('pipelane:badge', count);
  },
};

contextBridge.exposeInMainWorld('pipelaneDesktop', bridge);
