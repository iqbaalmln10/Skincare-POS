"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  appVersion: process.env.npm_package_version || "0.1.0",
  printReceipt: (payload) => electron.ipcRenderer.invoke("print-receipt", payload),
  printer: {
    listPorts: () => electron.ipcRenderer.invoke("printer:list-ports"),
    getSettings: () => electron.ipcRenderer.invoke("printer:get-settings"),
    saveSettings: (comPort) => electron.ipcRenderer.invoke("printer:save-settings", comPort)
  }
});
