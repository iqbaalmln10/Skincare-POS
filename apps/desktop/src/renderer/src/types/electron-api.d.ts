export interface PrinterPortInfo {
  path: string;
  manufacturer?: string;
  isLikelyBluetooth: boolean;
}

interface ElectronAPI {
  appVersion: string;
  printReceipt: (payload: unknown) => Promise<{ success: boolean; message?: string }>;
  printer: {
    listPorts: () => Promise<PrinterPortInfo[]>;
    getSettings: () => Promise<{ comPort: string | null }>;
    saveSettings: (comPort: string) => Promise<{ comPort: string | null }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
