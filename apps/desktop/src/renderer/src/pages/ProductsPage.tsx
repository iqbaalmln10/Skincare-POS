import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import "./ProductsPage.css";

interface Product {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  defaultSupplierId: number | null;
  defaultSupplierName: string | null;
  name: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  minStock: number;
  isActive: boolean;
}

interface Category {
  id: number;
  name: string;
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
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    categoryId: "",
    defaultSupplierId: "",
    costPrice: "",
    sellingPrice: "",
    stockQty: "",
    minStock: "5",
  });

  useEffect(() => {
    axios
      .get(`${API_BASE}/categories`)
      .then((res) => setCategories(res.data.data))
      .catch(() => setErrorMsg("Gagal memuat daftar kategori"));

    axios
      .get(`${API_BASE}/suppliers`)
      .then((res) => setSuppliers(res.data.data))
      .catch(() => setErrorMsg("Gagal memuat daftar pemasok"));
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
        .catch(() => setErrorMsg("Gagal memuat daftar produk. Pastikan backend berjalan."))
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, categoryFilter]);

  const filtered = useMemo(() => products, [products]);

  function resetForm() {
    setForm({
      name: "",
      sku: "",
      categoryId: "",
      defaultSupplierId: "",
      costPrice: "",
      sellingPrice: "",
      stockQty: "",
      minStock: "5",
    });
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) return;

    try {
      const res = await axios.post(`${API_BASE}/products`, {
        name: form.name.trim(),
        sku: form.sku.trim(),
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        defaultSupplierId: form.defaultSupplierId ? Number(form.defaultSupplierId) : null,
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        stockQty: Number(form.stockQty) || 0,
        minStock: Number(form.minStock) || 5,
      });

      setProducts((prev) => [res.data.data, ...prev]);
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal menyimpan produk");
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
      setErrorMsg(err.response?.data?.message || "Gagal mengubah status produk");
    }
  }

  return (
    <>
      <div className="page-head-row">
        <div className="page-head">
          <h1>Data Master Produk</h1>
          <p>Kelola harga, stok, dan detail produk skincare kamu</p>
        </div>
        {user?.role === "admin" && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Tambah Produk Baru
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="card" style={{ borderColor: "#e5484d", color: "#e5484d", marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      <div className="card">
        <div className="products-toolbar">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              placeholder="Cari nama produk atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
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
              filtered.map((p) => {
                const lowStock = p.stockQty <= p.minStock;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        <div className="thumb">{initialsOf(p.name)}</div>
                        <div>
                          <div className="p-name">{p.name}</div>
                          <div className="p-sku">{p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.categoryName ?? "—"}</td>
                    <td>{formatRp(p.costPrice)}</td>
                    <td>{formatRp(p.sellingPrice)}</td>
                    <td>
                      <span className={`stock-pill${lowStock ? " low" : ""}`}>
                        {p.stockQty} pcs{lowStock ? " · Menipis" : ""}
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
                      <button className="icon-btn danger" onClick={() => handleDelete(p.id)} title="Hapus produk">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!isLoading && filtered.length === 0 && (
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
            <h3>Tambah Produk Baru</h3>
            <form onSubmit={handleAddProduct} className="product-form">
              <label>Nama Produk</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth. Radiance Rose Serum"
                required
              />

              <label>SKU</label>
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="cth. SKU-1006"
                required
              />

              <label>Kategori</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">— Tanpa kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label>Pemasok Tetap (opsional)</label>
              <select
                value={form.defaultSupplierId}
                onChange={(e) => setForm({ ...form, defaultSupplierId: e.target.value })}
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
                  <label>Harga Modal (Rp)</label>
                  <input
                    type="number"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label>Harga Jual (Rp)</label>
                  <input
                    type="number"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label>Stok Awal</label>
                  <input
                    type="number"
                    value={form.stockQty}
                    onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label>Min. Stok</label>
                  <input
                    type="number"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
