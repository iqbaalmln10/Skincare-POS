import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/api";
import "./SuppliersPage.css";

interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const EMPTY_FORM = { name: "", phone: "", address: "" };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  // null = mode tambah baru, angka = mode edit supplier dengan id tsb.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function loadSuppliers() {
    setIsLoading(true);
    axios
      .get(`${API_BASE}/suppliers`, { params: { includeInactive: "true" } })
      .then((res) => {
        setSuppliers(res.data.data);
        setErrorMsg(null);
      })
      .catch(() => setErrorMsg("Gagal memuat daftar supplier. Pastikan backend berjalan."))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filtered = suppliers.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone ?? "").toLowerCase().includes(q) ||
      (s.address ?? "").toLowerCase().includes(q)
    );
  });

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s) => s.isActive).length;

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEditModal(s: Supplier) {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone ?? "", address: s.address ?? "" });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    };

    try {
      if (editingId) {
        const res = await axios.put(`${API_BASE}/suppliers/${editingId}`, payload);
        setSuppliers((prev) => prev.map((s) => (s.id === editingId ? res.data.data : s)));
      } else {
        const res = await axios.post(`${API_BASE}/suppliers`, payload);
        setSuppliers((prev) => [res.data.data, ...prev]);
      }
      setShowModal(false);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          (editingId ? "Gagal memperbarui supplier" : "Gagal menambah supplier")
      );
    }
  }

  async function toggleActive(id: number) {
    try {
      const res = await axios.patch(`${API_BASE}/suppliers/${id}/toggle-active`);
      setSuppliers((prev) => prev.map((s) => (s.id === id ? res.data.data : s)));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal mengubah status supplier");
    }
  }

  return (
    <>
      <div className="page-head-row">
        <div className="page-head">
          <h1>Supplier Directory</h1>
          <p>Kelola data supplier untuk restock produk lewat menu Purchases</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + New Supplier
        </button>
      </div>

      {errorMsg && (
        <div className="card" style={{ borderColor: "#e5484d", color: "#e5484d", marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      <div className="grid-3">
        <div className="card kpi-card">
          <div className="kpi-label">Total Supplier</div>
          <div className="kpi-value">{totalSuppliers}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Supplier Aktif</div>
          <div className="kpi-value">{activeSuppliers}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Supplier Nonaktif</div>
          <div className="kpi-value">{totalSuppliers - activeSuppliers}</div>
        </div>
      </div>

      <div className="card mt-20">
        <div className="card-title-row">
          <h3>Daftar Supplier</h3>
          <span className="muted">{filtered.length} supplier</span>
        </div>

        <div className="products-toolbar">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              placeholder="Cari nama, telepon, atau alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Telepon</th>
              <th>Alamat</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="empty-row">Memuat data...</td>
              </tr>
            )}
            {!isLoading &&
              filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="customer-cell">
                      <div className="avatar-circle">{initialsOf(s.name)}</div>
                      <div className="c-name">{s.name}</div>
                    </div>
                  </td>
                  <td>{s.phone ?? "—"}</td>
                  <td>{s.address ?? "—"}</td>
                  <td>
                    <button
                      className={`status-toggle${s.isActive ? " active" : ""}`}
                      onClick={() => toggleActive(s.id)}
                      title="Klik untuk ubah status"
                    >
                      {s.isActive ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td>
                    <button className="icon-btn" onClick={() => openEditModal(s)} title="Edit supplier">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">Tidak ada supplier yang cocok.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Supplier tidak punya tombol hapus permanen secara sengaja — lihat
            komentar toggleSupplierActive() di supplier.service.ts: purchase_orders
            & products masih mereferensikan supplier_id secara historis, jadi
            hanya nonaktifkan, bukan hapus. */}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Supplier" : "Tambah Supplier Baru"}</h3>
            <form onSubmit={handleSubmit} className="customer-form">
              <label>Nama Supplier</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth. CV Sumber Cantik"
                required
              />

              <label>No. Telepon (opsional)</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0812-xxxx-xxxx"
              />

              <label>Alamat (opsional)</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Alamat lengkap gudang/kantor supplier"
                rows={2}
              />

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? "Simpan Perubahan" : "Simpan Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
