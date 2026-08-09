import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/api";
import "./CategoryManagerModal.css";

interface Category {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  productCount: number;
}

interface CategoryManagerModalProps {
  onClose: () => void;
  // Dipanggil tiap kali data kategori berubah supaya dropdown di form
  // produk (yang punya list kategori sendiri) langsung ikut ter-update.
  onChanged: () => void;
}

const EMPTY_FORM = { name: "", code: "" };

export default function CategoryManagerModal({ onClose, onChanged }: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function load() {
    setIsLoading(true);
    axios
      .get(`${API_BASE}/categories`, { params: { includeInactive: "true" } })
      .then((res) => {
        setCategories(res.data.data);
        setErrorMsg(null);
      })
      .catch(() => setErrorMsg("Gagal memuat daftar kategori"))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(c: Category) {
    setEditingId(c.id);
    setForm({ name: c.name, code: c.code });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      if (editingId) {
        await axios.put(`${API_BASE}/categories/${editingId}`, {
          name: form.name.trim(),
          code: form.code.trim() || undefined,
        });
      } else {
        await axios.post(`${API_BASE}/categories`, {
          name: form.name.trim(),
          code: form.code.trim() || undefined,
        });
      }
      cancelEdit();
      load();
      onChanged();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || (editingId ? "Gagal memperbarui kategori" : "Gagal menambah kategori")
      );
    }
  }

  async function toggleActive(id: number) {
    try {
      await axios.patch(`${API_BASE}/categories/${id}/toggle-active`);
      load();
      onChanged();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal mengubah status kategori");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card category-manager-card" onClick={(e) => e.stopPropagation()}>
        <h3>Kelola Kategori</h3>

        {errorMsg && <div className="category-manager-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="category-manager-form">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama kategori, cth. Sunscreen"
            required
          />
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="Kode (opsional)"
            maxLength={6}
            className="category-code-input"
          />
          <button type="submit" className="btn btn-primary">
            {editingId ? "Simpan" : "Tambah"}
          </button>
          {editingId && (
            <button type="button" className="btn btn-outline" onClick={cancelEdit}>
              Batal
            </button>
          )}
        </form>
        <p className="category-manager-hint">
          Kode kategori jadi prefix SKU produk (mis. "SER" → SER-0001). Kosongkan biar dibuatkan otomatis dari nama.
        </p>

        <table className="data-table category-manager-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Kode</th>
              <th>Produk</th>
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
              categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <span className="category-code-pill">{c.code}</span>
                  </td>
                  <td>{c.productCount}</td>
                  <td>
                    <button
                      className={`status-toggle${c.isActive ? " active" : ""}`}
                      onClick={() => toggleActive(c.id)}
                      title="Klik untuk ubah status"
                    >
                      {c.isActive ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td>
                    <button className="icon-btn" onClick={() => startEdit(c)} title="Edit kategori">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
