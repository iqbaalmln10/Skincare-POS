import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/api";
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
  productIds: number[];
}

interface ProductOption {
  id: number;
  name: string;
}

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

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
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "percent" as DiscountType,
    value: "",
    scope: "all_products" as Scope,
    startDate: iso(today),
    endDate: iso(addDays(today, 7)),
    productIds: [] as number[],
  });

  function loadPromotions() {
    axios
      .get(`${API_BASE}/promotions`)
      .then((res) => setPromotions(res.data.data))
      .catch(() => setErrorMsg("Gagal memuat daftar promo"));
  }

  useEffect(() => {
    loadPromotions();
    axios
      .get(`${API_BASE}/products`)
      .then((res) => setProducts(res.data.data.map((p: any) => ({ id: p.id, name: p.name }))))
      .catch(() => setErrorMsg("Gagal memuat daftar produk"));
  }, []);

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
    setForm({
      name: "",
      type: "percent",
      value: "",
      scope: "all_products",
      startDate: iso(today),
      endDate: iso(addDays(today, 7)),
      productIds: [],
    });
  }

  function toggleProductSelection(id: number) {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter((p) => p !== id)
        : [...prev.productIds, id],
    }));
  }

  async function handleCreatePromo(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.value) return;

    if (form.scope === "specific_product" && form.productIds.length === 0) {
      setErrorMsg('Cakupan "Produk Tertentu" wajib pilih minimal 1 produk');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/promotions`, {
        name: form.name.trim(),
        type: form.type,
        value: Number(form.value),
        scope: form.scope,
        startDate: form.startDate,
        endDate: form.endDate,
        productIds: form.scope === "specific_product" ? form.productIds : undefined,
      });
      setPromotions((prev) => [res.data.data, ...prev]);
      resetForm();
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal membuat promo");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(id: number) {
    try {
      const res = await axios.patch(`${API_BASE}/promotions/${id}/toggle-active`);
      setPromotions((prev) => prev.map((p) => (p.id === id ? res.data.data : p)));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal mengubah status promo");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Yakin ingin menghapus promo ini?")) return;
    try {
      await axios.delete(`${API_BASE}/promotions/${id}`);
      setPromotions((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal menghapus promo");
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Discount Management</h1>
        <p>Konfigurasi promo dan diskon berbasis event</p>
      </div>

      {errorMsg && (
        <div className="card" style={{ borderColor: "#e5484d", color: "#e5484d", marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      <div className="grid-2 discounts-grid">
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
                  placeholder={form.type === "percent" ? "cth. 20 (maks 100)" : "cth. 15000"}
                  max={form.type === "percent" ? 100 : undefined}
                  required
                />
              </div>
            </div>

            <label>Cakupan</label>
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as Scope })}>
              <option value="all_products">Semua Produk</option>
              <option value="specific_product">Produk Tertentu</option>
            </select>

            {form.scope === "specific_product" && (
              <div className="product-picker">
                {products.length === 0 && <p className="muted">Belum ada produk.</p>}
                {products.map((p) => (
                  <label key={p.id} className="product-picker-item">
                    <input
                      type="checkbox"
                      checked={form.productIds.includes(p.id)}
                      onChange={() => toggleProductSelection(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}

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

            <button type="submit" className="btn btn-primary btn-block promo-submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Aktifkan Diskon"}
            </button>
          </form>
        </div>

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
                      {p.scope === "all_products" ? "Semua produk" : `${p.productIds.length} produk`}
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
    </>
  );
}
