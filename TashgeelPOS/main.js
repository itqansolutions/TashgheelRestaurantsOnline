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
    }
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
