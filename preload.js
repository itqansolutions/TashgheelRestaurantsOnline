const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  selectBackupFolder: () => ipcRenderer.invoke('select-backup-folder'),
  saveBackupFile: (folderPath, filename, data) => ipcRenderer.invoke('save-backup-file', folderPath, filename, data),
  checkFileExists: (folderPath, filename) => ipcRenderer.invoke('check-file-exists', folderPath, filename)
});
// window.electronAPI.getMachineId()