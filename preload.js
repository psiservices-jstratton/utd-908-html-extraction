const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loadVersions: () => ipcRenderer.invoke('load-versions'),
    onMessage: (callback) => ipcRenderer.on('message', (e, ...other) => callback(e, ...other)),
    testView: () => ipcRenderer.invoke('test-view'),
    startGenerating: () => ipcRenderer.invoke('start-generating'),
});

console.log("preload.js loaded successfully");
