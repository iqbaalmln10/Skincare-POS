import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../lib/api";
import "./PurchasesPage.css";

type POStatus = "pending" | "received" | "cancelled";
type SupplierMode = "existing" | "new";

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
}

interface ItemValidationError {
  product?: string;
  quantity?: string;
  unitCost?: string;
}

interface FormValidationErrors {
  supplier?: string;
  newSupplierName?: string;
  newSupplierPhone?: string;
  note?: string;
  items?: ItemValidationError[];
}

const statusLabel: Record<POStatus, { text: string; cls: string }> = {
  pending: { text: "Pending", cls: "status-pending" },
  received: { text: "Received", cls: "status-paid" },
  cancelled: { text: "Cancelled", cls: "status-overdue" },
};

function formatRp(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}

function formatCurrencyInput(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function parseCurrencyInput(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
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
  const [supplierMode, setSupplierMode] = useState<SupplierMode>("existing");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<POItem[]>([{ productId: 0, quantity: 1, unitCost: 0 }]);

  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [validationErrors, setValidationErrors] = useState<FormValidationErrors>({});
  const navigate = useNavigate();

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

  // Produk yang tampil di dropdown item difilter sesuai supplier yang dipilih.
  // Kalau tidak ada supplier yang dipilih, tampilkan semua produk aktif.
  useEffect(() => {
    const params = supplierId ? { supplierId } : {};

    axios
      .get(`${API_BASE}/products`, { params })
      .then((res) => {
        const opts: ProductOption[] = res.data.data.map((p: any) => ({ id: p.id, name: p.name }));
        setProducts(opts);
        setItems((prev) =>
          prev.map((it) => ({
            ...it,
            productId: opts.some((o) => o.id === it.productId) ? it.productId : opts[0]?.id ?? 0,
          }))
        );
      })
      .catch(() => setErrorMsg("Gagal memuat daftar produk"));
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
    setItems((prev) => [...prev, { productId: products[0]?.id ?? 0, quantity: 1, unitCost: 0 }]);
  }
  function removeItemRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, patch: Partial<POItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function resetForm() {
    setNote("");
    setSupplierMode("existing");
    setNewSupplierName("");
    setNewSupplierPhone("");
    setItems([{ productId: products[0]?.id ?? 0, quantity: 1, unitCost: 0 }]);
    setValidationErrors({});
  }

  function validatePurchaseForm() {
    const errors: FormValidationErrors = {};

    if (supplierMode === "existing") {
      if (!supplierId) {
        errors.supplier = "Pilih supplier terlebih dahulu";
      }
    } else {
      const trimmedName = newSupplierName.trim();
      if (!trimmedName) {
        errors.newSupplierName = "Nama supplier wajib diisi";
      } else if (trimmedName.length < 2) {
        errors.newSupplierName = "Nama supplier minimal 2 karakter";
      }

      const trimmedPhone = newSupplierPhone.trim();
      if (trimmedPhone && !/^[0-9+()\s-]{6,15}$/.test(trimmedPhone)) {
        errors.newSupplierPhone = "Format nomor telepon tidak valid";
      }
    }

    if (note.trim().length > 200) {
      errors.note = "Catatan terlalu panjang (maksimal 200 karakter)";
    }

    const itemErrors = items.map((item) => {
      const rowError: ItemValidationError = {};
      if (!item.productId || item.productId === 0) {
        rowError.product = "Pilih produk";
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        rowError.quantity = "Qty minimal 1";
      }
      if (item.unitCost === undefined || item.unitCost < 0 || Number.isNaN(item.unitCost)) {
        rowError.unitCost = "Harga beli tidak boleh negatif";
      }
      return rowError;
    });

    const hasAnyItem = items.some((item) => item.productId && item.productId > 0 && item.quantity > 0 && item.unitCost >= 0);
    if (!hasAnyItem) {
      errors.items = itemErrors;
    } else {
      const hasInvalidRow = itemErrors.some((error) => Object.keys(error).length > 0);
      if (hasInvalidRow) {
        errors.items = itemErrors;
      }
    }

    return errors;
  }

  async function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    const errors = validatePurchaseForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setErrorMsg("Periksa kembali data yang belum valid");
      return;
    }

    let finalSupplierId = supplierMode === "existing" ? supplierId : null;
    if (supplierMode === "new") {
      const createdId = await handleAddSupplier();
      if (!createdId) {
        return;
      }
      finalSupplierId = createdId;
    }

    if (!finalSupplierId) {
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
        supplierId: finalSupplierId,
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

  async function handleAddSupplier(): Promise<number | null> {
    const trimmedName = newSupplierName.trim();
    const trimmedPhone = newSupplierPhone.trim();

    const errors: FormValidationErrors = {};
    if (!trimmedName) {
      errors.newSupplierName = "Nama supplier wajib diisi";
    } else if (trimmedName.length < 2) {
      errors.newSupplierName = "Nama supplier minimal 2 karakter";
    }
    if (trimmedPhone && !/^[0-9+()\s-]{6,15}$/.test(trimmedPhone)) {
      errors.newSupplierPhone = "Format nomor telepon tidak valid";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setErrorMsg("Periksa data supplier sebelum disimpan");
      return null;
    }

    try {
      const res = await axios.post(`${API_BASE}/suppliers`, {
        name: trimmedName,
        phone: trimmedPhone || null,
      });
      setSuppliers((prev) => [...prev, res.data.data]);
      setSupplierId(res.data.data.id);
      setSupplierMode("existing");
      setNewSupplierName("");
      setNewSupplierPhone("");
      setValidationErrors({});
      setErrorMsg(null);
      return res.data.data.id;
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal menambah supplier");
      return null;
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Purchases</h1>
        <p>Catat pembelian stok dari supplier untuk memperbarui stok dan HPP</p>
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
            <div className="supplier-tabs" role="tablist" aria-label="Pilihan supplier">
              <button
                type="button"
                className={`supplier-tab ${supplierMode === "existing" ? "active" : ""}`}
                onClick={() => setSupplierMode("existing")}
              >
                Pilih supplier
              </button>
              <button
                type="button"
                className={`supplier-tab ${supplierMode === "new" ? "active" : ""}`}
                onClick={() => setSupplierMode("new")}
              >
                Tambah supplier baru
              </button>
            </div>

            {supplierMode === "existing" ? (
              <div className="po-input-group">
                <select
                  value={supplierId ?? ""}
                  onChange={(e) => {
                    setSupplierId(Number(e.target.value));
                    setValidationErrors((prev) => ({ ...prev, supplier: undefined }));
                  }}
                >
                  <option value="">-- Pilih supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {validationErrors.supplier && <div className="field-error">{validationErrors.supplier}</div>}
              </div>
            ) : (
              <div className="supplier-form-card">
                <div className="po-input-group">
                  <input
                    placeholder="Nama supplier"
                    value={newSupplierName}
                    onChange={(e) => {
                      setNewSupplierName(e.target.value);
                      setValidationErrors((prev) => ({ ...prev, newSupplierName: undefined }));
                    }}
                  />
                  {validationErrors.newSupplierName && <div className="field-error">{validationErrors.newSupplierName}</div>}
                </div>
                <div className="po-input-group">
                  <input
                    placeholder="No. telepon (opsional)"
                    value={newSupplierPhone}
                    onChange={(e) => {
                      setNewSupplierPhone(e.target.value);
                      setValidationErrors((prev) => ({ ...prev, newSupplierPhone: undefined }));
                    }}
                  />
                  {validationErrors.newSupplierPhone && <div className="field-error">{validationErrors.newSupplierPhone}</div>}
                </div>
                <button type="button" className="mini-btn" onClick={handleAddSupplier}>
                  Simpan supplier
                </button>
              </div>
            )}

            <label>Item Pesanan</label>
            <div className="po-items">
              {items.map((item, idx) => (
                <div className="po-item-row" key={idx}>
                  <div className="po-input-group">
                    <span className="field-caption">Produk</span>
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        updateItem(idx, { productId: Number(e.target.value) });
                        setValidationErrors((prev) => ({
                          ...prev,
                          items: prev.items?.map((row, rowIdx) => (rowIdx === idx ? { ...row, product: undefined } : row)),
                        }));
                      }}
                    >
                      <option value={0}>-- Pilih produk --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {products.length === 0 ? (
                      <div className="field-hint">
                        Belum ada produk untuk supplier ini. Tambahkan produk dulu di menu Products, lalu pilih produk tersebut di sini.
                      </div>
                    ) : (
                      <div className="field-hint">Pilih produk yang sudah ada. Detail harga jual dan stok awal diatur di menu Products.</div>
                    )}
                    <button type="button" className="mini-btn" onClick={() => navigate("/products")}>
                      Buka menu Products
                    </button>
                    {validationErrors.items?.[idx]?.product && <div className="field-error">{validationErrors.items[idx].product}</div>}
                  </div>
                  <div className="po-input-group">
                    <span className="field-caption">Qty</span>
                    <input
                      type="number"
                      min={1}
                      className="qty-input"
                      value={item.quantity}
                      onChange={(e) => {
                        updateItem(idx, { quantity: Number(e.target.value) });
                        setValidationErrors((prev) => ({
                          ...prev,
                          items: prev.items?.map((row, rowIdx) => (rowIdx === idx ? { ...row, quantity: undefined } : row)),
                        }));
                      }}
                      placeholder="Qty"
                    />
                    {validationErrors.items?.[idx]?.quantity && <div className="field-error">{validationErrors.items[idx].quantity}</div>}
                  </div>
                  <div className="po-input-group">
                    <span className="field-caption">Harga beli</span>
                    <div className="currency-input">
                      <span className="currency-prefix">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="cost-input"
                        value={formatCurrencyInput(item.unitCost)}
                        onChange={(e) => {
                          const nextValue = parseCurrencyInput(e.target.value);
                          updateItem(idx, { unitCost: nextValue });
                          setValidationErrors((prev) => ({
                            ...prev,
                            items: prev.items?.map((row, rowIdx) => (rowIdx === idx ? { ...row, unitCost: undefined } : row)),
                          }));
                        }}
                        placeholder="Rp 0"
                      />
                    </div>
                    {validationErrors.items?.[idx]?.unitCost && <div className="field-error">{validationErrors.items[idx].unitCost}</div>}
                  </div>
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

            {validationErrors.items && !validationErrors.items.every((row) => Object.keys(row).length === 0) && (
              <div className="field-error" style={{ marginTop: 6 }}>
                Periksa setiap item sebelum membuat purchase order.
              </div>
            )}

            <button type="button" className="add-row-btn" onClick={addItemRow}>
              + Tambah item
            </button>

            <label>Catatan (opsional)</label>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setValidationErrors((prev) => ({ ...prev, note: undefined }));
              }}
              placeholder="Catatan internal atau informasi tambahan"
              rows={2}
            />
            {validationErrors.note && <div className="field-error">{validationErrors.note}</div>}

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
