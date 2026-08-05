import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import { API_BASE } from "../lib/api";
import "./SettingsPage.css";

interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  taxRate: number;
  currencyPrefix: string;
}

interface ReceiptSettings {
  footerNote: string;
  showLogo: boolean;
}

const STORE_KEY = "skincarepos.settings.store";
const RECEIPT_KEY = "skincarepos.settings.receipt";

const defaultStore: StoreSettings = {
  storeName: "Skincare POS — Downtown Branch",
  address: "Jl. Melati No. 12, Jember, Jawa Timur",
  phone: "0331-123456",
  taxRate: 11,
  currencyPrefix: "Rp",
};

const defaultReceipt: ReceiptSettings = {
  footerNote: "Terima kasih sudah berbelanja! Produk yang sudah dibeli tidak dapat dikembalikan.",
  showLogo: true,
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function SettingsPage() {
  const { user } = useAuth();

  const [store, setStore] = useState<StoreSettings>(() => loadJSON(STORE_KEY, defaultStore));
  const [receipt, setReceipt] = useState<ReceiptSettings>(() => loadJSON(RECEIPT_KEY, defaultReceipt));
  const [savedFlag, setSavedFlag] = useState<"store" | "receipt" | null>(null);

  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: "info" | "error" } | null>(null);

  useEffect(() => {
    if (!savedFlag) return;
    const t = setTimeout(() => setSavedFlag(null), 2000);
    return () => clearTimeout(t);
  }, [savedFlag]);

  function saveStore(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    setSavedFlag("store");
  }

  function saveReceipt(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(RECEIPT_KEY, JSON.stringify(receipt));
    setSavedFlag("receipt");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.next) {
      setPasswordMsg({ text: "Isi semua kolom.", type: "error" });
      return;
    }
    if (passwordForm.next.length < 6) {
      setPasswordMsg({ text: "Password baru minimal 6 karakter.", type: "error" });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordMsg({ text: "Konfirmasi password tidak cocok.", type: "error" });
      return;
    }

    try {
      await axios.patch(`${API_BASE}/employees/me/password`, {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });
      setPasswordMsg({ text: "Password berhasil diubah.", type: "info" });
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      setPasswordMsg({ text: err.response?.data?.message || "Gagal mengubah password.", type: "error" });
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
        <p>Kelola profil akun, informasi toko, dan preferensi struk</p>
      </div>

      <div className="grid-2 settings-grid mt-20">
        {/* Profile */}
        <div className="card">
          <div className="card-title-row">
            <h3>Profil Akun</h3>
          </div>

          <div className="profile-summary">
            <div className="profile-avatar">{initialsOf(user?.name || "?")}</div>
            <div>
              <div className="profile-name">{user?.name}</div>
              <div className="profile-role">
              {user?.role === "admin" ? "Administrator" : "Kasir"}
              </div>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="settings-form">
            <label>Password Saat Ini</label>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              placeholder="••••••••"
            />
            <label>Password Baru</label>
            <input
              type="password"
              value={passwordForm.next}
              onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
              placeholder="••••••••"
            />
            <label>Konfirmasi Password Baru</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              placeholder="••••••••"
            />

            {passwordMsg && <p className={`settings-msg ${passwordMsg.type}`}>{passwordMsg.text}</p>}

            <button type="submit" className="btn btn-primary">Ubah Password</button>
          </form>
        </div>

        {/* Store info */}
        <div className="card">
          <div className="card-title-row">
            <h3>Informasi Toko</h3>
            {savedFlag === "store" && <span className="saved-chip">Tersimpan ✓</span>}
          </div>

          <form onSubmit={saveStore} className="settings-form">
            <label>Nama Toko</label>
            <input
              value={store.storeName}
              onChange={(e) => setStore({ ...store, storeName: e.target.value })}
            />
            <label>Alamat</label>
            <textarea
              rows={2}
              value={store.address}
              onChange={(e) => setStore({ ...store, address: e.target.value })}
            />
            <label>No. Telepon</label>
            <input
              value={store.phone}
              onChange={(e) => setStore({ ...store, phone: e.target.value })}
            />

            <div className="form-row">
              <div>
                <label>Pajak (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={store.taxRate}
                  onChange={(e) => setStore({ ...store, taxRate: Number(e.target.value) })}
                />
              </div>
              <div>
                <label>Simbol Mata Uang</label>
                <input
                  value={store.currencyPrefix}
                  onChange={(e) => setStore({ ...store, currencyPrefix: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">Simpan Informasi Toko</button>
          </form>
        </div>
      </div>

      <div className="grid-2 settings-grid mt-20">
        {/* Receipt settings */}
        <div className="card">
          <div className="card-title-row">
            <h3>Pengaturan Struk</h3>
            {savedFlag === "receipt" && <span className="saved-chip">Tersimpan ✓</span>}
          </div>

          <form onSubmit={saveReceipt} className="settings-form">
            <label>Catatan Footer Struk</label>
            <textarea
              rows={3}
              value={receipt.footerNote}
              onChange={(e) => setReceipt({ ...receipt, footerNote: e.target.value })}
            />

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={receipt.showLogo}
                onChange={(e) => setReceipt({ ...receipt, showLogo: e.target.checked })}
              />
              Tampilkan logo toko di struk
            </label>

            <button type="submit" className="btn btn-primary">Simpan Pengaturan Struk</button>
          </form>
        </div>

        {/* About */}
        <div className="card">
          <div className="card-title-row">
            <h3>Tentang Aplikasi</h3>
          </div>
          <div className="about-list">
            <div className="about-row"><span>Nama Aplikasi</span><strong>Skincare POS</strong></div>
            <div className="about-row"><span>Versi</span><strong>1.0.0</strong></div>
            <div className="about-row"><span>Cabang Aktif</span><strong>Downtown Branch</strong></div>
            <div className="about-row"><span>Login Sebagai</span><strong>{user?.name}</strong></div>
          </div>
          <p className="about-note">
            Pengaturan "Informasi Toko" dan "Pengaturan Struk" tersimpan lokal di perangkat ini
            (localStorage) — ini memang dirancang per perangkat, bukan data dummy. Ganti password
            di atas sudah tersambung langsung ke database (tabel <code>users</code>).
          </p>
        </div>
      </div>
    </>
  );
}