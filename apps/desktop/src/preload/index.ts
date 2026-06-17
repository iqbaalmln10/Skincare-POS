// Preload script: jembatan aman antara Electron main process dan renderer (React).
// Untuk MVP awal belum perlu expose API khusus karena renderer berkomunikasi
// ke backend Express via HTTP biasa (axios), bukan lewat IPC.
// File ini disiapkan sebagai tempat menambah contextBridge.exposeInMainWorld
// jika nanti butuh akses fitur native (misal dialog print, file system).

import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  appVersion: process.env.npm_package_version || "0.1.0"
});
