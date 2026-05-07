import { app, BrowserWindow, screen } from 'electron';
import Store from 'electron-store';
import path from 'path';

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

interface StoreSchema {
  windowState: WindowState;
}

const DEFAULT_STATE: WindowState = {
  width: 1400,
  height: 900,
  maximized: false,
};

const store = new Store<StoreSchema>({
  defaults: { windowState: DEFAULT_STATE },
});

let mainWindow: BrowserWindow | null = null;
let quittingExplicitly = false;

export function setQuittingExplicitly(): void {
  quittingExplicitly = true;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function isOnVisibleDisplay(state: WindowState): boolean {
  if (state.x === undefined || state.y === undefined) return true;
  return screen.getAllDisplays().some(d => {
    const wa = d.workArea;
    return (
      state.x! >= wa.x &&
      state.y! >= wa.y &&
      state.x! < wa.x + wa.width &&
      state.y! < wa.y + wa.height
    );
  });
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow) return mainWindow;

  const saved = store.get('windowState');
  const useSavedPosition = isOnVisibleDisplay(saved);

  mainWindow = new BrowserWindow({
    x: useSavedPosition ? saved.x : undefined,
    y: useSavedPosition ? saved.y : undefined,
    width: saved.width || DEFAULT_STATE.width,
    height: saved.height || DEFAULT_STATE.height,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#0b0b0c',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--pipelane-version=${app.getVersion()}`],
    },
  });

  if (saved.maximized) mainWindow.maximize();

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  const persistBounds = (): void => {
    if (!mainWindow) return;
    const isMax = mainWindow.isMaximized();
    if (isMax) {
      store.set('windowState', { ...store.get('windowState'), maximized: true });
      return;
    }
    const b = mainWindow.getBounds();
    store.set('windowState', {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      maximized: false,
    });
  };

  mainWindow.on('resize', persistBounds);
  mainWindow.on('move', persistBounds);
  mainWindow.on('maximize', persistBounds);
  mainWindow.on('unmaximize', persistBounds);

  mainWindow.on('close', e => {
    if (process.platform === 'darwin' && !quittingExplicitly) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}
