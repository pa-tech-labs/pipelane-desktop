import { app, ipcMain, Notification } from 'electron';
import { getMainWindow } from './window';
import type { PipelaneNotificationOpts } from '../types/bridge';

export function registerNotificationHandlers(): void {
  ipcMain.on('pipelane:notify', (_event, opts: PipelaneNotificationOpts) => {
    if (!opts || typeof opts.title !== 'string' || typeof opts.body !== 'string') return;

    const win = getMainWindow();
    const focused = win && win.isFocused() && win.isVisible() && !win.isMinimized();
    if (focused) return;

    if (!Notification.isSupported()) return;

    const notif = new Notification({
      title: opts.title,
      body: opts.body,
      silent: false,
    });

    notif.on('click', () => {
      const w = getMainWindow();
      if (w) {
        if (w.isMinimized()) w.restore();
        if (!w.isVisible()) w.show();
        w.focus();
        w.webContents.send('pipelane:notification-clicked', opts.data);
      }
    });

    notif.show();
  });

  ipcMain.on('pipelane:badge', (_event, count: unknown) => {
    const n = typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    if (process.platform === 'darwin') {
      app.setBadgeCount(n);
    }
  });
}
