import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../lib/api";
import CurrencyInput from "../components/CurrencyInput";
import "./PurchasesPage.css";

type POStatus = "pending" | "received" | "cancelled";

interface POItem {
  productId: number;
  quantity: number;
  unitCost: number;
}

interface POItemHistory extends POItem {
  productName: string;
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId: number | null;
  supplierName: string | null;
  createdAt: string;
  items: POItemHistory[];
  totalAmount: number;
  status: POStatus;
  note: string | null;
}

interface Supplier {
  id: number;
  name: string;
}

interface ProductOption {
  id: number;
  name: string;
  costPrice: number;
}

const statusLabel: Record<POStatus, { text: string; cls: string }> = {
  pending: { text: "Pending", cls: "status-pending" },
  received: { text: "Received", cls: "status-paid" },
  cancelled: { text: "Cancelled", cls: "status-overdue" },
};

function formatRp(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}
function formatDateID(d: string) {
  // Backend kirim format "YYYY-MM-DD HH:MM:SS" (SQLite datetime), Safari/Chrome
  // butuh "T" sebagai pemisah supaya bisa diparse jadi Date yang valid.
  return new Date(d.replace(" ", "T")).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<POItem[]>([{ productId: 0, quantity: 1, unitCost: 0 }]);

  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");

  function loadOrders() {
    axios
      .get(`${API_BASE}/purchases`)
      .then((res) => setOrders(res.data.data))
      .catch(() => setErrorMsg("Gagal memuat riwayat purchase order"));
  }

  function loadSuppliers() {
    axios
      .get(`${API_BASE}/suppliers`)
      .then((res) => {
        setSuppliers(res.data.data);
        if (res.data.data.length > 0) {
          setSupplierId((prev) => prev ?? res.data.data[0].id);
        }
      })
      .catch(() => setErrorMsg("Gagal memuat daftar supplier"));
  }

  useEffect(() => {
    loadOrders();
    loadSuppliers();
  }, []);

  // Produk yang tampil di dropdown item difilter sesuai supplier yang dipilih —
  // produk dengan default_supplier_id kosong tetap muncul (dianggap "produk umum").
  useEffect(() => {
    if (!supplierId) return;

    axios
      .get(`${API_BASE}/products`, { params: { supplierId } })
      .then((res) => {
        const opts: ProductOption[] = res.data.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          costPrice: p.costPrice,
        }));
        setProducts(opts);
        // Reset pilihan produk di setiap baris item ke produk pertama yang valid
        // untuk supplier baru (supaya tidak mismatch produk-supplier), dan ikut
        // prefill ulang harga beli dari cost_price produk barunya.
        setItems((prev) =>
          prev.map((it) => {
            if (opts.some((o) => o.id === it.productId)) return it;
            const fallback = opts[0];
            return { ...it, productId: fallback?.id ?? 0, unitCost: fallback?.costPrice ?? 0 };
          })
        );
      })
      .catch(() => setErrorMsg("Gagal memuat daftar produk untuk supplier ini"));
  }, [supplierId]);

  const stats = useMemo(() => {
    const totalPO = orders.length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const activeValue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + o.totalAmount, 0);
    return { totalPO, pending, activeValue };
  }, [orders]);

  const draftTotal = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  function addItemRow() {
    setItems((prev) => [
      ...prev,
      { productId: products[0]?.id ?? 0, quantity: 1, unitCost: products[0]?.costPrice ?? 0 },
    ]);
  }
  function removeItemRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, patch: Partial<POItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  // Begitu produk dipilih, harga beli satuan di-prefill dari harga modal
  // (cost_price) produk itu saat ini — cuma sebagai starting point yang
  // bisa langsung diedit, BUKAN dikunci. Harga beli riil dari supplier
  // memang bisa beda tiap PO (nego, promo, dll), jadi field ini harus
  // tetap manual-editable; lihat diskusi metode last-cost sebelumnya.
  function handleProductChange(idx: number, productId: number) {
    const product = products.find((p) => p.id === productId);
    updateItem(idx, { productId, unitCost: product?.costPrice ?? 0 });
  }

  function resetForm() {
    setNote("");
    setItems([{ productId: products[0]?.id ?? 0, quantity: 1, unitCost: products[0]?.costPrice ?? 0 }]);
  }

  async function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) {
      setErrorMsg("Pilih supplier terlebih dahulu");
      return;
    }

    const validItems = items.filter((i) => i.productId && i.quantity > 0 && i.unitCost >= 0);
    if (validItems.length === 0) {
      setErrorMsg("Isi minimal 1 item pesanan yang valid");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/purchases`, {
        supplierId,
        note: note.trim() || null,
        items: validItems,
      });
      setOrders((prev) => [res.data.data, ...prev]);
      resetForm();
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal membuat purchase order");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function setStatus(id: number, status: "received" | "cancelled") {
    if (status === "received" && !confirm("Konfirmasi barang sudah diterima? Stok produk akan otomatis bertambah.")) {
      return;
    }

    try {
      const res = await axios.patch(`${API_BASE}/purchases/${id}/status`, { status });
      setOrders((prev) => prev.map((o) => (o.id === id ? res.data.data : o)));
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal mengubah status PO");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Yakin ingin menghapus purchase order ini?")) return;

    try {
      await axios.delete(`${API_BASE}/purchases/${id}`);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err: any) {
      // PO berstatus 'received' ditolak backend — stok sudah terlanjur masuk.
      setErrorMsg(err.response?.data?.message || "Gagal menghapus purchase order");
    }
  }

  async function handleAddSupplier() {
    if (!newSupplierName.trim()) return;

    try {
      const res = await axios.post(`${API_BASE}/suppliers`, {
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || null,
      });
      setSuppliers((prev) => [...prev, res.data.data]);
      setSupplierId(res.data.data.id);
      setNewSupplierName("");
      setNewSupplierPhone("");
      setShowAddSupplier(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal menambah supplier");
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Purchases</h1>
        <p>Buat dan kelola pesanan pembelian ke supplier</p>
      </div>

      {errorMsg && (
        <div className="card" style={{ borderColor: "#e5484d", color: "#e5484d", marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      <div className="grid-3">
        <div className="card kpi-card">
          <div className="kpi-label">Total Purchase Order</div>
          <div className="kpi-value">{stats.totalPO}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Menunggu Konfirmasi</div>
          <div className="kpi-value">{stats.pending}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Nilai Pembelian (Aktif)</div>
          <div className="kpi-value">{formatRp(stats.activeValue)}</div>
        </div>
      </div>

      <div className="grid-2 purchases-grid mt-20">
        <div className="card">
          <div className="card-title-row">
            <h3>New Restock Order</h3>
          </div>

          <form onSubmit={handleCreatePO} className="po-form">
            <label>Supplier</label>
            <div className="po-item-row" style={{ marginBottom: showAddSupplier ? 8 : 0 }}>
              <select
                value={supplierId ?? ""}
                onChange={(e) => setSupplierId(Number(e.target.value))}
                style={{ flex: 1 }}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button type="button" className="add-row-btn" onClick={() => setShowAddSupplier((v) => !v)}>
                + Supplier
              </button>
            </div>

            {showAddSupplier && (
              <div style={{ marginBottom: 8 }}>
                <div className="po-item-row" style={{ marginBottom: 6 }}>
                  <input
                    placeholder="Nama supplier baru"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                  />
                  <input
                    placeholder="No. telepon (opsional)"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                  />
                  <button type="button" className="mini-btn" onClick={handleAddSupplier}>
                    Simpan
                  </button>
                </div>
                {/* Quick-add di sini sengaja cuma nama+telepon (buru-buru saat mau
                    restock). Untuk alamat, atau edit/nonaktifkan supplier lama,
                    arahkan ke halaman Suppliers penuh. */}
                <Link to="/suppliers" className="muted" style={{ fontSize: 12.5 }}>
                  Perlu isi alamat atau kelola supplier lain? Buka halaman Suppliers →
                </Link>
              </div>
            )}

            <div className="po-items-head-row">
              <label style={{ margin: 0 }}>Item Pesanan</label>
              <Link
                to={supplierId ? `/products?supplierId=${supplierId}&openCreate=true` : "/products?openCreate=true"}
                className="add-row-btn"
              >
                + Produk Baru
              </Link>
            </div>
            <div className="po-items">
              <div className="po-item-row po-item-labels">
                <span>Produk</span>
                <span>Qty</span>
                <span>Harga Beli / pcs</span>
                <span></span>
              </div>
              {items.map((item, idx) => (
                <div className="po-item-row" key={idx}>
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                  >
                    {products.length === 0 && <option value={0}>Tidak ada produk untuk supplier ini</option>}
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="qty-input"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    aria-label="Jumlah (pcs)"
                  />
                  <CurrencyInput
                    value={item.unitCost}
                    onChange={(v) => updateItem(idx, { unitCost: v })}
                  />
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => removeItemRow(idx)}
                    disabled={items.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="add-row-btn" onClick={addItemRow}>
              + Tambah item
            </button>

            <label>Catatan Internal (opsional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan arsip internal — tidak dikirim ke supplier, misal alasan harga naik atau janji pengiriman"
              rows={2}
            />

            <div className="po-total-box">
              <span>Total Pesanan</span>
              <strong>{formatRp(draftTotal)}</strong>
            </div>

            <button type="submit" className="btn btn-primary btn-block po-submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Buat Purchase Order"}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title-row">
            <h3>Riwayat Purchase Orders</h3>
            <span className="muted">{orders.length} PO</span>
          </div>

          <div className="po-history-list">
            {orders.map((o) => (
              <div className="po-history-item" key={o.id}>
                <div className="po-hist-top">
                  <div>
                    <div className="po-number">{o.poNumber}</div>
                    <div className="po-supplier">
                      {o.supplierName ?? "—"} · {formatDateID(o.createdAt)}
                    </div>
                  </div>
                  <span className={`status-pill ${statusLabel[o.status].cls}`}>
                    {statusLabel[o.status].text}
                  </span>
                </div>
                <div className="po-hist-items">
                  {o.items.map((it, i) => (
                    <div key={i}>
                      {it.productName} × {it.quantity}
                    </div>
                  ))}
                </div>
                <div className="po-hist-bottom">
                  <div className="po-hist-total">{formatRp(o.totalAmount)}</div>
                  <div className="po-hist-actions">
                    {o.status === "pending" && (
                      <>
                        <button className="mini-btn" onClick={() => setStatus(o.id, "received")}>
                          Terima
                        </button>
                        <button className="mini-btn danger" onClick={() => setStatus(o.id, "cancelled")}>
                          Batalkan
                        </button>
                      </>
                    )}
                    {/* PO 'received' dikunci — tidak boleh dihapus karena stok sudah masuk */}
                    {o.status !== "received" && (
                      <button className="icon-btn danger" onClick={() => handleDelete(o.id)} title="Hapus">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <div className="empty-row">Belum ada purchase order.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
