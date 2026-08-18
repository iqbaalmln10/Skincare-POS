import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { compressImageToDataUrl } from "../lib/image";
import CurrencyInput from "../components/CurrencyInput";
import BarcodeScannerModal from "../components/BarcodeScannerModal";
import { useKeyboardWedgeScanner } from "../hooks/useKeyboardWedgeScanner";
import CategoryManagerModal from "../components/CategoryManagerModal";
import defaultProductImg from "../assets/default-product.svg";
import "./ProductsPage.css";

interface Product {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  defaultSupplierId: number | null;
  defaultSupplierName: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  minStock: number;
  imagePath: string | null;
  isActive: boolean;
}

interface Category {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

interface Supplier {
  id: number;
  name: string;
}

const ALL_CATEGORIES = "all";

function formatRp(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const EMPTY_FORM = {
  name: "",
  sku: "",
  categoryId: "",
  defaultSupplierId: "",
  barcode: "",
  costPrice: "" as number | "",
  sellingPrice: "" as number | "",
  stockQty: "" as number | "",
  minStock: 5 as number | "",
  imagePath: "" as string | null,
};

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);

  const [showModal, setShowModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // null = mode tambah baru, angka = mode edit produk dengan id tsb.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Scanner USB fisik (keyboard-wedge, mis. iWare) — aktif cuma saat modal
  // tambah/edit produk terbuka, supaya scan barcode di luar konteks itu
  // (mis. lagi browsing list produk) tidak nyasar ngisi form yang salah.
  useKeyboardWedgeScanner({
    enabled: showModal,
    onScan: (code) => setForm((f) => ({ ...f, barcode: code })),
  });
  const [skuPreview, setSkuPreview] = useState("");

  function loadCategories() {
    axios
      .get(`${API_BASE}/categories`)
      .then((res) => setCategories(res.data.data))
      .catch(() => setErrorMsg("Gagal memuat daftar kategori"));
  }

  useEffect(() => {
    loadCategories();
    axios
      .get(`${API_BASE}/suppliers`)
      .then((res) => setSuppliers(res.data.data))
      .catch(() => setErrorMsg("Gagal memuat daftar supplier"));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(true);
      const params: Record<string, string> = { includeInactive: "true" };
      if (search.trim()) params.search = search.trim();
      if (categoryFilter !== ALL_CATEGORIES) params.categoryId = categoryFilter;

      axios
        .get(`${API_BASE}/products`, { params })
        .then((res) => {
          setProducts(res.data.data);
          setErrorMsg(null);
        })
        .catch(() =>
          setErrorMsg("Gagal memuat daftar produk. Pastikan backend berjalan."),
        )
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, categoryFilter]);

  // Pratinjau SKU otomatis mengikuti kategori yang dipilih — cuma dipakai
  // saat TAMBAH produk baru. SKU final tetap di-generate ulang di backend
  // saat submit (lihat komentar di routes/products.ts) supaya tidak ada
  // race condition; ini murni preview visual untuk user.
  useEffect(() => {
    if (editingId) return; // mode edit pakai SKU asli produk, bukan preview
    const params = form.categoryId ? { categoryId: form.categoryId } : {};
    axios
      .get(`${API_BASE}/products/next-sku`, { params })
      .then((res) => setSkuPreview(res.data.data.sku))
      .catch(() => setSkuPreview(""));
  }, [form.categoryId, editingId, showModal]);

  function openAddModal(defaultSupplierId?: string) {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, defaultSupplierId: defaultSupplierId ?? "" });
    setShowModal(true);
  }

  // Dibuka dari shortcut "+ Produk Baru" di Purchases (lihat PurchasesPage.tsx)
  // supaya tidak perlu pindah menu manual & retype nama supplier.
  useEffect(() => {
    if (searchParams.get("openCreate") === "true") {
      openAddModal(searchParams.get("supplierId") ?? undefined);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEditModal(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku,
      categoryId: p.categoryId ? String(p.categoryId) : "",
      defaultSupplierId: p.defaultSupplierId ? String(p.defaultSupplierId) : "",
      barcode: p.barcode ?? "",
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      stockQty: p.stockQty,
      minStock: p.minStock,
      imagePath: p.imagePath,
    });
    setShowModal(true);
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // supaya bisa pilih file yang sama lagi kalau mau ganti
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("File yang dipilih bukan gambar");
      return;
    }

    try {
      const dataUrl = await compressImageToDataUrl(file);
      setForm((f) => ({ ...f, imagePath: dataUrl }));
    } catch {
      setErrorMsg("Gagal memproses gambar, coba file lain");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (!form.barcode.trim()) {
      setErrorMsg(
        "Barcode wajib diisi. Scan atau ketik manual barcode produk.",
      );
      return;
    }
    if (form.sellingPrice === "" || Number(form.sellingPrice) <= 0) {
      setErrorMsg("Harga jual wajib diisi dan lebih dari 0");
      return;
    }

    const basePayload = {
      name: form.name.trim(),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      defaultSupplierId: form.defaultSupplierId
        ? Number(form.defaultSupplierId)
        : null,
      barcode: form.barcode.trim() || null,
      sellingPrice: Number(form.sellingPrice),
      minStock: form.minStock === "" ? 5 : Number(form.minStock),
      imagePath: form.imagePath || null,
    };

    try {
      if (editingId) {
        // costPrice & stockQty sengaja TIDAK dikirim saat edit — backend
        // memang mengabaikan keduanya (cost_price cuma berubah lewat
        // Purchases saat barang diterima, stock_qty lewat Purchases/Sales),
        // jadi mengirimnya cuma bikin bingung tanpa efek apa pun.
        const res = await axios.put(`${API_BASE}/products/${editingId}`, {
          ...basePayload,
          sku: form.sku.trim(),
        });
        setProducts((prev) =>
          prev.map((p) => (p.id === editingId ? res.data.data : p)),
        );
      } else {
        const res = await axios.post(`${API_BASE}/products`, {
          ...basePayload,
          costPrice: form.costPrice === "" ? 0 : Number(form.costPrice),
          stockQty: form.stockQty === "" ? 0 : Number(form.stockQty),
          // sku TIDAK dikirim — biar backend generate otomatis dari kategori.
        });
        setProducts((prev) => [res.data.data, ...prev]);
      }
      setShowModal(false);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          (editingId ? "Gagal memperbarui produk" : "Gagal menyimpan produk"),
      );
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Yakin ingin menghapus produk ini?")) return;

    try {
      await axios.delete(`${API_BASE}/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal menghapus produk");
    }
  }

  async function toggleActive(id: number) {
    try {
      const res = await axios.patch(`${API_BASE}/products/${id}/toggle-active`);
      setProducts((prev) => prev.map((p) => (p.id === id ? res.data.data : p)));
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || "Gagal mengubah status produk",
      );
    }
  }

  // Dihitung tiap render dari form.costPrice & form.sellingPrice supaya
  // langsung update real-time saat user mengetik di kedua field — dipakai
  // buat nampilin estimasi keuntungan (Rp + %) di antara field Harga Modal
  // dan Harga Jual, biar user tidak perlu itung manual buat nentuin harga.
  // Persentase dihitung dari harga modal (markup), bukan dari harga jual
  // (margin), karena itu yang lebih intuitif buat pertanyaan "modal segini,
  // untungnya berapa persen".
  const costNum = form.costPrice === "" ? 0 : Number(form.costPrice);
  const sellNum = form.sellingPrice === "" ? 0 : Number(form.sellingPrice);
  const profitAmount = sellNum - costNum;
  const profitPct = costNum > 0 ? (profitAmount / costNum) * 100 : null;
  const showProfitHint = costNum > 0 && sellNum > 0;

  return (
    <>
      <div className="page-head-row">
        <div className="page-head">
          <h1>Product Master Data</h1>
          <p>Kelola harga, stok, dan detail produk skincare kamu</p>
        </div>
        {isAdmin && (
          <div className="page-head-actions">
            <button
              className="btn btn-outline"
              onClick={() => setShowCategoryManager(true)}
            >
              Kelola Kategori
            </button>
            <button className="btn btn-primary" onClick={() => openAddModal()}>
              + Add New Product
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div
          className="card"
          style={{ borderColor: "#e5484d", color: "#e5484d", marginBottom: 12 }}
        >
          {errorMsg}
        </div>
      )}

      <div className="card">
        <div className="products-toolbar">
          <div className="search-box">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              placeholder="Cari nama produk, SKU, atau barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value={ALL_CATEGORIES}>Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Kategori</th>
              <th>Harga Modal</th>
              <th>Harga Jual</th>
              <th>Stok</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="empty-row">
                  Memuat data...
                </td>
              </tr>
            )}
            {!isLoading &&
              products.map((p) => {
                const lowStock = p.stockQty <= p.minStock;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        {p.imagePath ? (
                          <img
                            className="thumb-img"
                            src={p.imagePath}
                            alt={p.name}
                          />
                        ) : (
                          <div className="thumb">{initialsOf(p.name)}</div>
                        )}
                        <div>
                          <div className="p-name">{p.name}</div>
                          <div className="p-sku">
                            {p.sku}
                            {p.barcode ? ` · ${p.barcode}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{p.categoryName ?? "—"}</td>
                    <td>{formatRp(p.costPrice)}</td>
                    <td>{formatRp(p.sellingPrice)}</td>
                    <td>
                      <span className={`stock-pill${lowStock ? " low" : ""}`}>
                        {p.stockQty} pcs{lowStock ? " · Low" : ""}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`status-toggle${p.isActive ? " active" : ""}`}
                        onClick={() => toggleActive(p.id)}
                        title="Klik untuk ubah status"
                      >
                        {p.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          onClick={() => openEditModal(p)}
                          title="Edit produk"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={() => handleDelete(p.id)}
                          title="Hapus produk"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-row">
                  Tidak ada produk yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Produk" : "Tambah Produk Baru"}</h3>
            <form onSubmit={handleSubmit} className="product-form">
              <label>Foto Produk (opsional)</label>
              <div className="image-upload-row">
                <img
                  className="image-preview"
                  src={form.imagePath || defaultProductImg}
                  alt="Preview produk"
                />
                <div className="image-upload-actions">
                  <label className="btn btn-outline btn-file">
                    Pilih Foto
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleImageSelected}
                    />
                  </label>
                  {form.imagePath && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setForm((f) => ({ ...f, imagePath: "" }))}
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>

              <label>Nama Produk</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth. Radiance Rose Serum"
                required
              />

              <label>Kategori</label>
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
              >
                <option value="">— Tanpa kategori (Umum) —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label>SKU</label>
              {editingId ? (
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="cth. SER-0001"
                  required
                />
              ) : (
                <input
                  value={skuPreview}
                  disabled
                  placeholder="Pilih kategori dulu..."
                />
              )}
              {!editingId && (
                <p className="field-hint">
                  SKU dibuat otomatis mengikuti kode kategori yang dipilih.
                </p>
              )}

              <label>Barcode</label>
              <div className="barcode-row">
                <input
                  value={form.barcode}
                  onChange={(e) =>
                    setForm({ ...form, barcode: e.target.value })
                  }
                  placeholder="Scan atau ketik manual"
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline btn-scan"
                  onClick={() => setShowScanner(true)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M20 8V6a2 2 0 0 0-2-2h-2M20 16v2a2 2 0 0 1-2 2h-2M7 12h10" />
                  </svg>
                  Scan
                </button>
              </div>
              <p className="field-hint">
                Scanner USB fisik bisa langsung dipakai kapan saja selama form ini terbuka — tidak perlu klik field ini dulu.
              </p>

              <label>Supplier Tetap (opsional)</label>
              <select
                value={form.defaultSupplierId}
                onChange={(e) =>
                  setForm({ ...form, defaultSupplierId: e.target.value })
                }
              >
                <option value="">— Bisa dipasok siapa saja —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <div className="form-row">
                <div>
                  <label>
                    Harga Modal (Rp){editingId ? "" : " — perkiraan awal"}
                  </label>
                  {editingId ? (
                    <>
                      <CurrencyInput
                        value={form.costPrice}
                        onChange={() => {}}
                        disabled
                      />
                      <p className="field-hint">
                        Harga modal hanya berubah otomatis lewat Purchases saat
                        barang diterima, bukan di sini.
                      </p>
                    </>
                  ) : (
                    <CurrencyInput
                      value={form.costPrice}
                      onChange={(v) => setForm({ ...form, costPrice: v })}
                    />
                  )}
                </div>
                <div>
                  <label>Harga Jual (Rp)</label>
                  <CurrencyInput
                    value={form.sellingPrice}
                    onChange={(v) => setForm({ ...form, sellingPrice: v })}
                    required
                  />
                </div>
              </div>
              {showProfitHint && (
                <p
                  className={`profit-hint${profitAmount < 0 ? " profit-negative" : ""}`}
                >
                  {profitAmount >= 0
                    ? `Estimasi keuntungan: ${formatRp(profitAmount)} (${profitPct!.toFixed(1)}% dari harga modal)`
                    : `Rugi ${formatRp(Math.abs(profitAmount))} — harga jual lebih rendah dari harga modal`}
                </p>
              )}

              <div className="form-row">
                <div>
                  <label>Stok Awal{editingId ? " (saat ini)" : ""}</label>
                  {editingId ? (
                    <input value={`${form.stockQty} pcs`} disabled />
                  ) : (
                    <input
                      type="number"
                      min={0}
                      value={form.stockQty}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          stockQty:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  )}
                </div>
                <div>
                  <label>Min. Stok</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minStock}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minStock:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    placeholder="5"
                  />
                </div>
              </div>
              <p className="field-hint">
                Stok awal dan min. stok itu dua angka terpisah, tidak
                dijumlahkan. Min. stok cuma jadi ambang batas: begitu stok ≤
                angka ini, produk ditandai "Low Stock".
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? "Simpan Perubahan" : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScannerModal
          onDetected={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showCategoryManager && (
        <CategoryManagerModal
          onClose={() => setShowCategoryManager(false)}
          onChanged={loadCategories}
        />
      )}
    </>
  );
}
