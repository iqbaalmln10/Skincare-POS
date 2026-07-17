import { useMemo, useState } from "react";
import "./ProductsPage.css";

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  minStock: number;
  isActive: boolean;
}

// 🔶 DATA DUMMY — state lokal saja, belum nyambung ke backend/database
const initialProducts: Product[] = [
  { id: 1, name: "Radiance Rose Serum", sku: "SKU-1001", category: "Serum", costPrice: 45000, sellingPrice: 89000, stockQty: 42, minStock: 10, isActive: true },
  { id: 2, name: "Deep Sea Hydra Cream", sku: "SKU-1002", category: "Moisturizer", costPrice: 62000, sellingPrice: 129000, stockQty: 8, minStock: 10, isActive: true },
  { id: 3, name: "Detox Charcoal Mask", sku: "SKU-1003", category: "Mask", costPrice: 38000, sellingPrice: 75000, stockQty: 27, minStock: 10, isActive: true },
  { id: 4, name: "Hydro Marine Cleanser", sku: "SKU-1004", category: "Cleanser", costPrice: 30000, sellingPrice: 59000, stockQty: 4, minStock: 10, isActive: true },
  { id: 5, name: "Botanical Oil Cleanser", sku: "SKU-1005", category: "Cleanser", costPrice: 33000, sellingPrice: 68000, stockQty: 60, minStock: 10, isActive: false },
];

const CATEGORY_OPTIONS = ["Semua Kategori", "Serum", "Moisturizer", "Mask", "Cleanser", "Toner", "Sunscreen"];

function formatRp(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua Kategori");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "Serum",
    costPrice: "",
    sellingPrice: "",
    stockQty: "",
    minStock: "5",
  });

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "Semua Kategori" || p.category === category;
      return matchSearch && matchCategory;
    });
  }, [products, search, category]);

  function resetForm() {
    setForm({ name: "", sku: "", category: "Serum", costPrice: "", sellingPrice: "", stockQty: "", minStock: "5" });
  }

  function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) return;

    const newProduct: Product = {
      id: Math.max(0, ...products.map((p) => p.id)) + 1,
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category,
      costPrice: Number(form.costPrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      stockQty: Number(form.stockQty) || 0,
      minStock: Number(form.minStock) || 5,
      isActive: true,
    };

    setProducts((prev) => [newProduct, ...prev]);
    resetForm();
    setShowModal(false);
  }

  function handleDelete(id: number) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function toggleActive(id: number) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
  }

  return (
    <>
      <div className="page-head-row">
        <div className="page-head">
          <h1>Product Master Data</h1>
          <p>Kelola harga, stok, dan detail produk skincare kamu</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add New Product
        </button>
      </div>

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
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c}>{c}</option>
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
            {filtered.map((p) => {
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
                  <td>{p.category}</td>
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
                    <button className="icon-btn danger" onClick={() => handleDelete(p.id)} title="Hapus produk">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
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
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORY_OPTIONS.filter((c) => c !== "Semua Kategori").map((c) => (
                  <option key={c}>{c}</option>
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