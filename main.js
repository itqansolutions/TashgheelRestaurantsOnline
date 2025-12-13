const { app, BrowserWindow, ipcMain } = require('electron');
const { machineIdSync } = require('node-machine-id');
const path = require('path');
const fs = require('fs');

// === Main POS window ===
function createMainWindow() {
  const mainWin = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'icon.ico') // 🟢 loaded from root
  });

  mainWin.loadFile('index.html');
}

// === License DevTool window (if exists) ===
function openLicenseToolIfExists() {
  const licensePath = path.join(__dirname, 'license.html');

  if (fs.existsSync(licensePath)) {
    const licenseWin = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    licenseWin.loadFile('license.html');
  } else {
    console.log("✅ license.html not found. Skipping DevTool.");
  }
}

app.whenReady().then(() => {
  createMainWindow();           // 🟢 Always open index.html
  openLicenseToolIfExists();    // 🟢 Open license.html if exists
});

ipcMain.handle('get-machine-id', () => {
  return machineIdSync(); // returns fingerprint
});

// === Backup System handlers ===
const { dialog } = require('electron');

ipcMain.handle('select-backup-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('save-backup-file', async (event, folderPath, filename, data) => {
  try {
    const fullPath = path.join(folderPath, filename);
    fs.writeFileSync(fullPath, data, 'utf8');
    return { success: true, path: fullPath };
  } catch (error) {
    console.error('Backup save failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-file-exists', async (event, folderPath, filename) => {
  const fullPath = path.join(folderPath, filename);
  return fs.existsSync(fullPath);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
