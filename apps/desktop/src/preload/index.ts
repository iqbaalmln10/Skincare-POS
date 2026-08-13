// Preload script: jembatan aman antara Electron main process dan renderer (React).
// Untuk MVP awal belum perlu expose API khusus karena renderer berkomunikasi
// ke backend Express via HTTP biasa (axios), bukan lewat IPC.
// File ini disiapkan sebagai tempat menambah contextBridge.exposeInMainWorld
// jika nanti butuh akses fitur native (misal dialog print, file system).

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  appVersion: process.env.npm_package_version || "0.1.0",
  printReceipt: (payload: unknown) => ipcRenderer.invoke("print-receipt", payload),
  printer: {
    listPorts: () => ipcRenderer.invoke("printer:list-ports"),
    getSettings: () => ipcRenderer.invoke("printer:get-settings"),
    saveSettings: (comPort: string) => ipcRenderer.invoke("printer:save-settings", comPort),
  },
});
