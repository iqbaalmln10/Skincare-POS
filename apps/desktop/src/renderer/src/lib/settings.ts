// Pengaturan toko & struk disimpan per-perangkat di localStorage (bukan di database),
// karena tiap cabang/komputer kasir bisa punya kop struk berbeda. Dipakai bareng oleh
// SettingsPage (form edit) dan SalesPage (render struk saat cetak).

export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  taxRate: number;
  currencyPrefix: string;
}

export interface ReceiptSettings {
  footerNote: string;
  showLogo: boolean;
}

export const STORE_KEY = "skincarepos.settings.store";
export const RECEIPT_KEY = "skincarepos.settings.receipt";

export const defaultStore: StoreSettings = {
  storeName: "By Me",
  address: "Jl. Melati No. 12, Jember, Jawa Timur",
  phone: "0331-123456",
  taxRate: 11,
  currencyPrefix: "Rp",
};

export const defaultReceipt: ReceiptSettings = {
  footerNote: "Terima kasih sudah berbelanja! Produk yang sudah dibeli tidak dapat dikembalikan.",
  showLogo: true,
};

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
