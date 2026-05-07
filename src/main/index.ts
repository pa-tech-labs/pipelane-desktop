import { app, BrowserWindow, session, shell } from 'electron';
import { machineIdSync } from 'node-machine-id';
import { createMainWindow, getMainWindow, setQuittingExplicitly } from './window';
import { registerNotificationHandlers } from './notifications';
import { setupAutoUpdater } from './updater';

const APP_URL = 'https://pipelane.app';
const APP_HOST = 'pipelane.app';

app.setName('Pipelane');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  const win = getMainWindow();
  if (win) {
    if (win.isMinimized()) win.restore();
    if (!win.isVisible()) win.show();
    win.focus();
  }
});

let deviceId = '';
try {
  deviceId = machineIdSync(true);
} catch (err) {
  console.error('[main] failed to read machine id', err);
}

function isPipelaneHost(hostname: string): boolean {
  return hostname === APP_HOST || hostname.endsWith(`.${APP_HOST}`);
}

function configureSession(): void {
  const ses = session.defaultSession;

  const baseUa = ses.getUserAgent();
  ses.setUserAgent(`${baseUa} PipelaneDesktop/${app.getVersion()}`);

  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    if (deviceId) {
      details.requestHeaders['X-Device-Id'] = deviceId;
    }
    callback({ requestHeaders: details.requestHeaders });
  });
}

function attachWindowHandlers(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (isPipelaneHost(u.hostname)) {
        return { action: 'allow' };
      }
    } catch {
      // fall through to external
    }
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    try {
      const u = new URL(url);
      if (isPipelaneHost(u.hostname)) return;
    } catch {
      // fall through to external
    }
    event.preventDefault();
    void shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  configureSession();
  registerNotificationHandlers();

  const win = createMainWindow();
  attachWindowHandlers(win);
  void win.loadURL(APP_URL);

  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  const existing = getMainWindow();
  if (existing) {
    if (!existing.isVisible()) existing.show();
    existing.focus();
    return;
  }
  if (BrowserWindow.getAllWindows().length === 0) {
    const win = createMainWindow();
    attachWindowHandlers(win);
    void win.loadURL(APP_URL);
  }
});

app.on('before-quit', () => {
  setQuittingExplicitly();
});
