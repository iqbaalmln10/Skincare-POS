import { useMemo, useState } from "react";
import "./DiscountsPage.css";

type DiscountType = "percent" | "fixed_amount";
type Scope = "all_products" | "specific_product";

interface Promotion {
  id: number;
  name: string;
  type: DiscountType;
  value: number;
  scope: Scope;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  isActive: boolean;
}

// 🔶 DATA DUMMY — state lokal saja, belum nyambung ke backend/database
const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const initialPromotions: Promotion[] = [
  { id: 1, name: "Flash Sale Akhir Pekan", type: "percent", value: 20, scope: "all_products", startDate: iso(addDays(today, -2)), endDate: iso(addDays(today, 1)), isActive: true },
  { id: 2, name: "Diskon Member Baru", type: "fixed_amount", value: 15000, scope: "all_products", startDate: iso(addDays(today, -10)), endDate: iso(addDays(today, 20)), isActive: true },
  { id: 3, name: "Promo Serum & Cleanser", type: "percent", value: 15, scope: "specific_product", startDate: iso(addDays(today, -20)), endDate: iso(addDays(today, -5)), isActive: true },
  { id: 4, name: "Winter Hydration Series", type: "percent", value: 30, scope: "specific_product", startDate: iso(addDays(today, 5)), endDate: iso(addDays(today, 25)), isActive: true },
  { id: 5, name: "Bundling Ramadan", type: "fixed_amount", value: 25000, scope: "all_products", startDate: iso(addDays(today, 15)), endDate: iso(addDays(today, 40)), isActive: false },
];

function getStatus(p: Promotion): { text: string; cls: string } {
  if (!p.isActive) return { text: "Nonaktif", cls: "status-overdue" };
  const now = iso(today);
  if (now < p.startDate) return { text: "Terjadwal", cls: "status-pending" };
  if (now > p.endDate) return { text: "Berakhir", cls: "status-overdue" };
  return { text: "Aktif", cls: "status-paid" };
}

function formatValue(p: Promotion) {
  return p.type === "percent" ? `${p.value}%` : `Rp${p.value.toLocaleString("id-ID")}`;
}

function formatDateID(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DiscountsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);

  const [form, setForm] = useState({
    name: "",
    type: "percent" as DiscountType,
    value: "",
    scope: "all_products" as Scope,
    startDate: iso(today),
    endDate: iso(addDays(today, 7)),
  });

  const stats = useMemo(() => {
    const activeNow = promotions.filter((p) => getStatus(p).text === "Aktif").length;
    const scheduled = promotions.filter((p) => getStatus(p).text === "Terjadwal").length;
    const percentPromos = promotions.filter((p) => p.type === "percent");
    const avgDiscount =
      percentPromos.length > 0
        ? Math.round(percentPromos.reduce((s, p) => s + p.value, 0) / percentPromos.length)
        : 0;
    return { activeNow, scheduled, avgDiscount };
  }, [promotions]);

  function resetForm() {
    setForm({ name: "", type: "percent", value: "", scope: "all_products", startDate: iso(today), endDate: iso(addDays(today, 7)) });
  }

  function handleCreatePromo(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.value) return;

    const newPromo: Promotion = {
      id: Math.max(0, ...promotions.map((p) => p.id)) + 1,
      name: form.name.trim(),
      type: form.type,
      value: Number(form.value),
      scope: form.scope,
      startDate: form.startDate,
      endDate: form.endDate,
      isActive: true,
    };

    setPromotions((prev) => [newPromo, ...prev]);
    resetForm();
  }

  function toggleActive(id: number) {
    setPromotions((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)));
  }

  function handleDelete(id: number) {
    setPromotions((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <>
      <div className="page-head">
        <h1>Discount Management</h1>
        <p>Konfigurasi promo dan diskon berbasis event untuk Downtown Branch</p>
      </div>

      <div className="grid-2 discounts-grid">
        {/* Form buat promo baru */}
        <div className="card">
          <div className="card-title-row">
            <h3>Buat Promo Baru</h3>
          </div>

          <div className="mini-stats">
            <div className="mini-stat">
              <div className="mini-value">{String(stats.activeNow).padStart(2, "0")}</div>
              <div className="mini-label">Aktif Sekarang</div>
            </div>
            <div className="mini-stat">
              <div className="mini-value">{String(stats.scheduled).padStart(2, "0")}</div>
              <div className="mini-label">Terjadwal</div>
            </div>
            <div className="mini-stat">
              <div className="mini-value">{stats.avgDiscount}%</div>
              <div className="mini-label">Rata-rata Diskon</div>
            </div>
          </div>

          <form onSubmit={handleCreatePromo} className="promo-form">
            <label>Nama Diskon</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="cth. Flash Sale Gajian"
              required
            />

            <div className="form-row">
              <div>
                <label>Tipe</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DiscountType })}>
                  <option value="percent">Persentase (%)</option>
                  <option value="fixed_amount">Nominal Tetap (Rp)</option>
                </select>
              </div>
              <div>
                <label>Nilai</label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === "percent" ? "cth. 20" : "cth. 15000"}
                  required
                />
              </div>
            </div>

            <label>Cakupan</label>
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as Scope })}>
              <option value="all_products">Semua Produk</option>
              <option value="specific_product">Produk Tertentu</option>
            </select>

            <div className="form-row">
              <div>
                <label>Tanggal Mulai</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label>Tanggal Berakhir</label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block promo-submit">
              Aktifkan Diskon
            </button>
          </form>
        </div>

        {/* Daftar live promotions */}
        <div className="card">
          <div className="card-title-row">
            <h3>Live Promotions</h3>
            <span className="muted">{promotions.length} promo</span>
          </div>

          <div className="promo-list">
            {promotions.map((p) => {
              const status = getStatus(p);
              return (
                <div className="promo-item" key={p.id}>
                  <div className="promo-main">
                    <div className="promo-name">{p.name}</div>
                    <div className="promo-meta">
                      {formatDateID(p.startDate)} — {formatDateID(p.endDate)} ·{" "}
                      {p.scope === "all_products" ? "Semua produk" : "Produk tertentu"}
                    </div>
                  </div>
                  <div className="promo-value">{formatValue(p)}</div>
                  <span className={`status-pill ${status.cls}`}>{status.text}</span>
                  <button
                    className="icon-btn"
                    onClick={() => toggleActive(p.id)}
                    title={p.isActive ? "Nonaktifkan" : "Aktifkan"}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      {p.isActive ? (
                        <>
                          <rect x="4" y="4" width="7" height="16" rx="1.5" />
                          <rect x="13" y="4" width="7" height="16" rx="1.5" />
                        </>
                      ) : (
                        <path d="M6 4l14 8-14 8V4z" />
                      )}
                    </svg>
                  </button>
                  <button className="icon-btn danger" onClick={() => handleDelete(p.id)} title="Hapus promo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                    </svg>
                  </button>
                </div>
              );
            })}
            {promotions.length === 0 && <div className="empty-row">Belum ada promo dibuat.</div>}
          </div>
        </div>
      </div>

      <div className="tip-banner mt-20">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        <div>
          <strong>Rekomendasi Promo</strong>
          Produk kategori "Cleanser" punya stok menumpuk bulan ini — pertimbangkan buat promo khusus kategori ini untuk mempercepat perputaran stok.
        </div>
      </div>
    </>
  );
}