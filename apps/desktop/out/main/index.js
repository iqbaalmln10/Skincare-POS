"use strict";
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
let mainWindow = null;
let backendProcess = null;
function startBackend() {
  if (!electron.app.isPackaged) {
    console.log("[main] Mode development — backend dijalankan manual via npm run dev:backend");
    return;
  }
  const backendPath = path.join(process.resourcesPath, "backend", "dist", "server.js");
  backendProcess = child_process.fork(backendPath, [], {
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
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  electron.ipcMain.handle("print-receipt", async (_event, payload) => {
    try {
      const { printReceiptToSerial } = await Promise.resolve().then(() => require("./chunks/printer-Bx-MvOIt.js"));
      await printReceiptToSerial(payload);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || "Gagal mencetak struk." };
    }
  });
  electron.ipcMain.handle("printer:list-ports", async () => {
    const { listPrinterPorts } = await Promise.resolve().then(() => require("./chunks/printer-Bx-MvOIt.js"));
    return listPrinterPorts();
  });
  electron.ipcMain.handle("printer:get-settings", async () => {
    const { getPrinterSettings } = await Promise.resolve().then(() => require("./chunks/printer-Bx-MvOIt.js"));
    return getPrinterSettings();
  });
  electron.ipcMain.handle("printer:save-settings", async (_event, comPort) => {
    const { savePrinterSettings } = await Promise.resolve().then(() => require("./chunks/printer-Bx-MvOIt.js"));
    return savePrinterSettings(comPort);
  });
  startBackend();
  createWindow();
});
electron.app.on("window-all-closed", () => {
  backendProcess?.kill();
  if (process.platform !== "darwin") electron.app.quit();
});
