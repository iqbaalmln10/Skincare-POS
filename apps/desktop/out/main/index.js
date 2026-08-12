"use strict";
const electron = require("electron");
const path = require("path");
const require$$0 = require("child_process");
let mainWindow = null;
let backendProcess = null;
function startBackend() {
  if (!electron.app.isPackaged) {
    console.log("[main] Mode development — backend dijalankan manual via npm run dev:backend");
    return;
  }
  const backendPath = path.join(process.resourcesPath, "backend", "dist", "server.js");
  backendProcess = require$$0.fork(backendPath, [], {
    env: { ...process.env, DB_PATH: path.join(electron.app.getPath("userData"), "kasir.db") }
  });
}
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (!electron.app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}
electron.app.whenReady().then(() => {
  electron.ipcMain.handle("print-receipt", async (_event, payload) => {
    try {
      const { printReceiptToSerial } = await Promise.resolve().then(() => require("./chunks/printer-C4V529H8.js"));
      await printReceiptToSerial(payload);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || "Gagal mencetak struk." };
    }
  });
  startBackend();
  createWindow();
});
electron.app.on("window-all-closed", () => {
  backendProcess?.kill();
  if (process.platform !== "darwin") electron.app.quit();
});
