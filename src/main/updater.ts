import { dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import { getMainWindow } from './window';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const INITIAL_DELAY_MS = 10 * 1000;

export function setupAutoUpdater(): void {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', err => {
    console.error('[updater] error', err);
  });

  autoUpdater.on('update-available', info => {
    console.log('[updater] update available', info?.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] no update available');
  });

  autoUpdater.on('update-downloaded', async info => {
    console.log('[updater] update downloaded', info?.version);
    const win = getMainWindow();
    const result = await dialog.showMessageBox(win ?? undefined!, {
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: 'A new version of Pipelane is ready to install.',
      detail: 'Restart to apply the update. Your work will be preserved.',
    });
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  const check = (): void => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('[updater] check failed', err);
    });
  };

  setTimeout(check, INITIAL_DELAY_MS);
  setInterval(check, FOUR_HOURS_MS);
}
