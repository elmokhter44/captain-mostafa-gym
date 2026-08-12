'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('loginAPI', {
  login: (username, password) => ipcRenderer.invoke('auth:login', { username, password }),
  resetToDefaults: () => ipcRenderer.invoke('auth:reset-defaults')
});
