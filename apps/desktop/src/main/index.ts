import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fork, ChildProcess } from "child_process";

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

function startBackend() {
  // Pada production, backend dijalankan sebagai child process dari Electron
  // sehingga user tidak perlu menjalankan server secara manual.
  // Saat development, jalankan backend terpisah via `npm run dev:backend`.
  if (!app.isPackaged) {
    console.log("[main] Mode development — backend dijalankan manual via npm run dev:backend");
    return;
  }

  const backendPath = path.join(process.resourcesPath, "backend", "dist", "server.js");
  backendProcess = fork(backendPath, [], {
    env: { ...process.env, DB_PATH: path.join(app.getPath("userData"), "kasir.db") }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.handle("print-receipt", async (_event, payload) => {
    try {
      const { printReceiptToSerial } = await import("./printer");
      await printReceiptToSerial(payload);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message || "Gagal mencetak struk." };
    }
  });

  startBackend();
  createWindow();
});

app.on("window-all-closed", () => {
  backendProcess?.kill();
  if (process.platform !== "darwin") app.quit();
});
