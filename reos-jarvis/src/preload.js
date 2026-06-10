const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvis', {
  readData: (filename) => ipcRenderer.invoke('read-data', filename),
  writeData: (filename, data) => ipcRenderer.invoke('write-data', filename, data),
  getStore: (key) => ipcRenderer.invoke('get-store', key),
  setStore: (key, value) => ipcRenderer.invoke('set-store', key, value),
  sendNotification: (opts) => ipcRenderer.invoke('send-notification', opts),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  showItem: (p) => ipcRenderer.invoke('show-item', p),
  getDataDir: () => ipcRenderer.invoke('get-data-dir'),
  getDocsDir: () => ipcRenderer.invoke('get-docs-dir'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  updateTray: (openTasks) => ipcRenderer.invoke('update-tray', openTasks),
  setAutostart: (enable) => ipcRenderer.invoke('set-autostart', enable),
  onNavigate: (cb) => ipcRenderer.on('navigate', (e, view) => cb(view)),
  removeNavigateListener: () => ipcRenderer.removeAllListeners('navigate')
});
