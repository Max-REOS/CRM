const { app, BrowserWindow, ipcMain, globalShortcut, Notification, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const fs = require('fs');
const os = require('os');

const store = new Store({ encryptionKey: 'reos-jarvis-secure-2026' });

let mainWindow = null;
let tray = null;
let isQuitting = false;

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const DOCS_DIR = path.join(DATA_DIR, 'documents');

function ensureDataDir() {
  [DATA_DIR, DOCS_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
  const files = ['sessions.json', 'knowledge.json', 'tasks.json', 'settings.json', 'accountability.log'];
  const defaults = {
    'sessions.json': '[]',
    'knowledge.json': '[]',
    'tasks.json': '[]',
    'settings.json': '{}',
    'accountability.log': '[]'
  };
  files.forEach(f => {
    const fp = path.join(DATA_DIR, f);
    if (!fs.existsSync(fp)) fs.writeFileSync(fp, defaults[f], 'utf8');
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#020408',
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    titleBarStyle: 'hidden',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const fallbackIcon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADvSURBVDiNpZMxCsJAEEXfZlOIYGFhKXgBD+BZPIKFvYWFpQcQPIGFYCEiWHgCC8HKNG4SyM7OTnaz2e1mFywoJGSTl8A8mHkz8z8GgCRJ0nVd13VZliRJkiRJ0nVdh2EYhmEYhuM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4juM4AP4BhQBGAAAAAElFTkSuQmCC'
  );

  try {
    tray = new Tray(fs.existsSync(iconPath) ? iconPath : fallbackIcon);
  } catch {
    tray = new Tray(fallbackIcon);
  }

  tray.setToolTip('REOS JARVIS');
  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu(openTaskCount = 0) {
  const contextMenu = Menu.buildFromTemplate([
    { label: 'JARVIS öffnen', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: 'Chat', click: () => { mainWindow.show(); mainWindow.focus(); mainWindow.webContents.send('navigate', 'chat'); } },
    { label: 'Globe', click: () => { mainWindow.show(); mainWindow.focus(); mainWindow.webContents.send('navigate', 'globe'); } },
    { label: `Tasks (${openTaskCount} offen)`, click: () => { mainWindow.show(); mainWindow.focus(); mainWindow.webContents.send('navigate', 'tasks'); } },
    { type: 'separator' },
    { label: 'Benachrichtigungen pausieren', submenu: [
      { label: '1 Stunde', click: () => pauseNotifications(60) },
      { label: '4 Stunden', click: () => pauseNotifications(240) },
      { label: 'Bis morgen', click: () => pauseNotifications(720) }
    ]},
    { type: 'separator' },
    { label: 'Einstellungen', click: () => { mainWindow.show(); mainWindow.webContents.send('navigate', 'settings'); } },
    { type: 'separator' },
    { label: 'JARVIS beenden', click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
}

let notificationPauseUntil = null;
function pauseNotifications(minutes) {
  notificationPauseUntil = Date.now() + minutes * 60 * 1000;
}

function sendNotification(title, body, actions) {
  if (notificationPauseUntil && Date.now() < notificationPauseUntil) return;
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  if (day === 0) return; // no Sunday
  if (hour >= 22 || hour < 9) return; // quiet hours
  const n = new Notification({ title, body, silent: false });
  n.show();
}

// IPC handlers
ipcMain.handle('read-data', (e, filename) => {
  try {
    const fp = path.join(DATA_DIR, filename);
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch { return filename.endsWith('.log') ? [] : {}; }
});

ipcMain.handle('write-data', (e, filename, data) => {
  try {
    fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch { return false; }
});

ipcMain.handle('get-store', (e, key) => store.get(key));
ipcMain.handle('set-store', (e, key, value) => { store.set(key, value); return true; });

ipcMain.handle('send-notification', (e, { title, body }) => sendNotification(title, body));

ipcMain.handle('open-path', (e, filePath) => shell.openPath(filePath));
ipcMain.handle('show-item', (e, filePath) => shell.showItemInFolder(filePath));

ipcMain.handle('get-data-dir', () => DATA_DIR);
ipcMain.handle('get-docs-dir', () => DOCS_DIR);

ipcMain.handle('window-minimize', () => mainWindow.minimize());
ipcMain.handle('window-maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.handle('window-close', () => mainWindow.hide());

ipcMain.handle('update-tray', (e, openTasks) => updateTrayMenu(openTasks));

ipcMain.handle('set-autostart', (e, enable) => {
  app.setLoginItemSettings({ openAtLogin: enable, openAsHidden: true });
  return true;
});

app.whenReady().then(() => {
  ensureDataDir();
  createWindow();
  createTray();

  globalShortcut.register('CommandOrControl+Shift+J', () => {
    if (mainWindow.isVisible()) { mainWindow.focus(); }
    else { mainWindow.show(); mainWindow.focus(); }
  });

  // Register module handlers
  try { require('./scheduler'); } catch (e) { console.error('Scheduler error:', e); }
  try { require('./calendar')(DATA_DIR, store); } catch (e) { console.error('Calendar error:', e); }
  try { require('./document-gen')(DOCS_DIR); } catch (e) { console.error('DocGen error:', e); }
  try { require('./google-drive-sync')(DATA_DIR, store); } catch (e) { console.error('DriveSync error:', e); }

  // QR code for PWA
  ipcMain.handle('get-pwa-qr', async () => {
    try {
      const QRCode = require('qrcode');
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      let localIP = 'localhost';
      for (const ifaces of Object.values(nets)) {
        for (const iface of ifaces) {
          if (iface.family === 'IPv4' && !iface.internal) { localIP = iface.address; break; }
        }
      }
      return await QRCode.toDataURL(`http://${localIP}:8080/pwa/`);
    } catch { return null; }
  });
});

app.on('before-quit', () => { isQuitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { /* keep running in tray */ });
