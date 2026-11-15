const { app, BrowserWindow, Menu, ipcMain, protocol, net, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');

// Register custom privileged scheme BEFORE app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

const APP_NAME = 'AI Video Maker';
const APP_ID = 'com.aitimes.aivideomaker';
const DEFAULT_FALLBACK_URLS = [
  'https://ais-pre-eval4556daji7ihjgwnfzr-589743996180.asia-northeast1.run.app',
  'https://ais-dev-eval4556daji7ihjgwnfzr-589743996180.asia-northeast1.run.app',
  'http://localhost:3000'
];

let mainWindow = null;
let activeServerUrl = DEFAULT_FALLBACK_URLS[0];
let updateStatus = {
  state: 'idle',
  currentVersion: app.getVersion(),
  availableVersion: null,
  percent: 0,
  message: ''
};

function getBundledConfig() {
  try {
    const configPath = path.join(__dirname, 'app-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (err) {
    console.warn('Could not read bundled app-config.json:', err.message);
  }
  return {};
}

function getUserConfigPath() {
  return path.join(app.getPath('userData'), 'desktop-config.json');
}

function getUserConfig() {
  try {
    const cfgPath = getUserConfigPath();
    if (fs.existsSync(cfgPath)) {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    }
  } catch (err) {
    console.warn('Could not read user desktop-config.json:', err.message);
  }
  return {};
}

function saveUserConfig(data) {
  try {
    const cfgPath = getUserConfigPath();
    fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
    const current = getUserConfig();
    fs.writeFileSync(cfgPath, JSON.stringify({ ...current, ...data }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save user desktop-config.json:', err.message);
  }
}

function normalizeServerUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

async function resolveActiveServerUrl() {
  const userCfg = getUserConfig();
  const bundled = getBundledConfig();
  const envUrl = process.env.AIVM_SERVER_URL;

  const candidates = [
    normalizeServerUrl(envUrl),
    normalizeServerUrl(userCfg.serverUrl),
    normalizeServerUrl(bundled.primaryUrl),
    ...(Array.isArray(bundled.fallbackUrls) ? bundled.fallbackUrls.map(normalizeServerUrl) : []),
    ...DEFAULT_FALLBACK_URLS
  ].filter((u, idx, arr) => u && arr.indexOf(u) === idx);

  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await net.fetch(`${candidate}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeout);
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data && data.status === 'ok') {
          activeServerUrl = candidate;
          return candidate;
        }
      }
    } catch {
      // Try next candidate
    }
  }

  activeServerUrl = candidates[0] || DEFAULT_FALLBACK_URLS[0];
  return activeServerUrl;
}

function broadcastUpdateStatus(next) {
  updateStatus = {
    ...updateStatus,
    ...next,
    currentVersion: app.getVersion()
  };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('aivm:update-status', updateStatus);
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  try {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: `${activeServerUrl}/downloads`
    });
  } catch (err) {
    console.warn('AutoUpdater feed setup warning:', err.message);
  }

  autoUpdater.on('checking-for-update', () => {
    broadcastUpdateStatus({ state: 'checking', message: 'Checking for updates...' });
  });

  autoUpdater.on('update-available', (info) => {
    broadcastUpdateStatus({
      state: 'available',
      availableVersion: info?.version || null,
      percent: 0,
      message: `Version ${info?.version || 'new'} is available. Downloading update...`
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    broadcastUpdateStatus({
      state: 'up-to-date',
      availableVersion: info?.version || app.getVersion(),
      percent: 100,
      message: 'You are running the latest version of AI Video Maker.'
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress?.percent || 0);
    broadcastUpdateStatus({
      state: 'downloading',
      percent: pct,
      message: `Downloading update (${pct}%)...`
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdateStatus({
      state: 'downloaded',
      availableVersion: info?.version || null,
      percent: 100,
      message: `Version ${info?.version || 'latest'} is ready to install. Click Restart & Install Update to apply.`
    });
  });

  autoUpdater.on('error', (err) => {
    broadcastUpdateStatus({
      state: 'error',
      message: err?.message || 'Unable to check for updates right now.'
    });
  });
}

function registerAppProtocol() {
  const distDir = path.resolve(__dirname, '..', 'dist');

  protocol.handle('app', async (request) => {
    const reqUrl = new URL(request.url);
    const pathname = decodeURIComponent(reqUrl.pathname || '/');

    if (pathname.startsWith('/api/') || pathname.startsWith('/downloads/')) {
      const targetUrl = `${activeServerUrl}${pathname}${reqUrl.search}`;
      const forwardHeaders = new Headers();
      request.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (!['host', 'origin', 'referer', 'connection'].includes(lower)) {
          forwardHeaders.set(key, value);
        }
      });

      const init = {
        method: request.method,
        headers: forwardHeaders
      };

      if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
        init.body = request.body;
        init.duplex = 'half';
      }

      try {
        return await net.fetch(targetUrl, init);
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Cannot reach AI Video Maker server (${activeServerUrl}). Please check your internet connection.`
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    let relativePath = pathname.replace(/^\/+/, '');
    if (!relativePath) {
      relativePath = 'index.html';
    }

    let candidatePath = path.resolve(distDir, relativePath);
    if (!candidatePath.startsWith(distDir)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (!fs.existsSync(candidatePath) || fs.statSync(candidatePath).isDirectory()) {
      candidatePath = path.join(distDir, 'index.html');
    }

    return net.fetch(pathToFileURL(candidatePath).href);
  });
}

function createApplicationMenu() {
  const template = [
    {
      label: 'AI Video Maker',
      submenu: [
        {
          label: 'Studio Home',
          click: () => {
            if (mainWindow) mainWindow.loadURL('app://studio/index.html');
          }
        },
        {
          label: 'My Video Requests',
          click: () => {
            if (mainWindow) mainWindow.loadURL('app://studio/?my-requests=true');
          }
        },
        {
          label: 'Contact & Budget',
          click: () => {
            if (mainWindow) mainWindow.loadURL('app://studio/?budget=true');
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            if (app.isPackaged) {
              autoUpdater.checkForUpdates().catch(() => {});
            } else {
              broadcastUpdateStatus({
                state: 'up-to-date',
                message: `Running development build v${app.getVersion()}.`
              });
            }
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit AI Video Maker' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Admin',
      submenu: [
        {
          label: 'Open Admin Login (/admin)',
          click: () => {
            if (mainWindow) mainWindow.loadURL('app://studio/?admin=true');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function getIconPath() {
  const candidates = [
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(__dirname, '..', 'build', 'icon.png'),
    path.join(__dirname, '..', 'dist', 'pwa-512x512.png')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

async function createMainWindow() {
  const startUrl = process.argv.includes('--admin')
    ? 'app://studio/?admin=true'
    : 'app://studio/index.html';

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    title: APP_NAME,
    icon: getIconPath(),
    backgroundColor: '#050811',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'persist:aivideomaker'
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  await mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  ipcMain.handle('aivm:get-info', () => ({
    isElectron: true,
    appName: APP_NAME,
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    serverUrl: activeServerUrl,
    updateStatus
  }));

  ipcMain.handle('aivm:set-server-url', async (_event, nextUrl) => {
    const clean = normalizeServerUrl(nextUrl);
    if (!clean || !clean.startsWith('http')) {
      return { success: false, error: 'Please enter a valid http:// or https:// server URL.' };
    }
    activeServerUrl = clean;
    saveUserConfig({ serverUrl: clean });
    if (app.isPackaged) {
      try {
        autoUpdater.setFeedURL({ provider: 'generic', url: `${activeServerUrl}/downloads` });
      } catch {}
    }
    return { success: true, serverUrl: activeServerUrl };
  });

  ipcMain.handle('aivm:check-updates', async () => {
    if (!app.isPackaged) {
      broadcastUpdateStatus({
        state: 'up-to-date',
        message: `AI Video Maker v${app.getVersion()} is up to date.`
      });
      return { success: true, status: updateStatus };
    }
    try {
      await autoUpdater.checkForUpdates();
      return { success: true, status: updateStatus };
    } catch (err) {
      broadcastUpdateStatus({ state: 'error', message: err?.message || 'Update check failed.' });
      return { success: false, error: err?.message || 'Update check failed.' };
    }
  });

  ipcMain.handle('aivm:download-update', async () => {
    if (!app.isPackaged) return { success: false };
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || 'Download update failed.' };
    }
  });

  ipcMain.handle('aivm:install-update', () => {
    if (app.isPackaged) {
      setImmediate(() => {
        autoUpdater.quitAndInstall(false, true);
      });
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('aivm:open-external', async (_event, url) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('aivm:navigate', async (_event, route) => {
    if (!mainWindow || mainWindow.isDestroyed()) return { success: false };
    if (route === 'admin') {
      await mainWindow.loadURL('app://studio/?admin=true');
    } else if (route === 'home') {
      await mainWindow.loadURL('app://studio/index.html');
    }
    return { success: true };
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.setName(APP_NAME);
  app.setAppUserModelId(APP_ID);

  app.whenReady().then(async () => {
    await resolveActiveServerUrl();
    registerAppProtocol();
    createApplicationMenu();
    registerIpcHandlers();
    await createMainWindow();
    setupAutoUpdater();

    if (app.isPackaged) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(() => {});
      }, 4500);

      setInterval(() => {
        autoUpdater.checkForUpdates().catch(() => {});
      }, 4 * 60 * 60 * 1000);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
