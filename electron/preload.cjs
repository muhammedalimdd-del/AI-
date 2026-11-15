const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aivmDesktop', {
  isElectron: true,
  platform: process.platform,
  arch: process.arch,
  getInfo: () => ipcRenderer.invoke('aivm:get-info'),
  setServerUrl: (url) => ipcRenderer.invoke('aivm:set-server-url', url),
  checkForUpdates: () => ipcRenderer.invoke('aivm:check-updates'),
  downloadUpdate: () => ipcRenderer.invoke('aivm:download-update'),
  installUpdate: () => ipcRenderer.invoke('aivm:install-update'),
  openExternal: (url) => ipcRenderer.invoke('aivm:open-external', url),
  navigate: (route) => ipcRenderer.invoke('aivm:navigate', route),
  onUpdateStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('aivm:update-status', listener);
    return () => {
      ipcRenderer.removeListener('aivm:update-status', listener);
    };
  }
});
