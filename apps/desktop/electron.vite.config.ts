import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    build: {
      outDir: "dist-electron/main",
      lib: { entry: "src/main/index.ts" }
    }
  },
  preload: {
    build: {
      outDir: "dist-electron/preload",
      lib: { entry: "src/preload/index.ts" }
    }
  },
  renderer: {
    root: "src/renderer",
    build: {
      outDir: "dist"
    },
    plugins: [react()]
  }
});
