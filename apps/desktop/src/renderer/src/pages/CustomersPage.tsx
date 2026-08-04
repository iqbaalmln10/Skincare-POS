import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/api";
import "./CustomersPage.css";

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  membershipTierId: number | null;
  membershipTierName: string | null;
  totalPoints: number;
  lastVisit: string | null;
  isActive: boolean;
}

interface MembershipTier {
  id: number;
  name: string;
  minPoints: number;
}

const ALL_TIERS = "all";
// Urutan visual badge tetap Bronze->Silver->Gold->Platinum secara warna,
// walau nama tier asli di DB beda (mis. "Reguler"). Di-mapping dari
// RANKING min_points, bukan dari nama literal tier.
const TIER_COLOR_CLASSES = ["tier-bronze", "tier-silver", "tier-gold", "tier-platinum"];

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatLastVisit(v: string | null) {
  if (!v) return "Belum pernah";
  const diffMs = Date.now() - new Date(v.replace(" ", "T")).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Hari ini";
  if (days < 7) return `${days} hari lalu`;
  if (days < 30) return `${Math.floor(days / 7)} minggu lalu`;
  return `${Math.floor(days / 30)} bulan lalu`;
}

// Deteksi sederhana: kalau mengandung "@" dan formatnya cocok pola email,
// dianggap email. Selain itu dianggap nomor telepon.
function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>(ALL_TIERS);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ name: "", contact: "" });

  useEffect(() => {
    axios
      .get(`${API_BASE}/membership-tiers`)
      .then((res) => setTiers(res.data.data))
      .catch(() => setErrorMsg("Gagal memuat daftar tier"));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(true);
      const params: Record<string, string> = { includeInactive: "true" };
      if (search.trim()) params.search = search.trim();
      if (tierFilter !== ALL_TIERS) params.tierId = tierFilter;

      axios
        .get(`${API_BASE}/customers`, { params })
        .then((res) => {
          setCustomers(res.data.data);
          setErrorMsg(null);
        })
        .catch(() => setErrorMsg("Gagal memuat daftar pelanggan. Pastikan backend berjalan."))
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, tierFilter]);

  const tierColorClass = useMemo(() => {
    const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
    const map = new Map<number, string>();
    sorted.forEach((t, idx) => map.set(t.id, TIER_COLOR_CLASSES[Math.min(idx, TIER_COLOR_CLASSES.length - 1)]));
    return map;
  }, [tiers]);

  const totalCustomers = customers.length;
  const totalPointsCirculating = customers.reduce((sum, c) => sum + c.totalPoints, 0);
  const activeCustomers = customers.filter((c) => c.isActive).length;

  function resetForm() {
    setForm({ name: "", contact: "" });
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const contact = form.contact.trim();
    const email = contact && isEmailLike(contact) ? contact : null;
    const phone = contact && !isEmailLike(contact) ? contact : null;

    try {
      const res = await axios.post(`${API_BASE}/customers`, {
        name: form.name.trim(),
        phone,
        email,
      });
      setCustomers((prev) => [res.data.data, ...prev]);
      resetForm();
      setShowModal(false);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal menyimpan pelanggan");
    }
  }

  async function toggleActive(id: number) {
    try {
      const res = await axios.patch(`${API_BASE}/customers/${id}/toggle-active`);
      setCustomers((prev) => prev.map((c) => (c.id === id ? res.data.data : c)));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal mengubah status pelanggan");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Yakin ingin menghapus pelanggan ini?")) return;

    try {
      await axios.delete(`${API_BASE}/customers/${id}`);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      // Ditolak backend kalau pelanggan sudah punya riwayat transaksi/poin
      setErrorMsg(err.response?.data?.message || "Gagal menghapus pelanggan");
    }
  }

  return (
    <>
      <div className="page-head-row">
        <div className="page-head">
          <h1>Customer Registry</h1>
          <p>Kelola data pelanggan, tier membership, dan poin loyalitas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Customer
        </button>
      </div>

      {errorMsg && (
        <div className="card" style={{ borderColor: "#e5484d", color: "#e5484d", marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      <div className="grid-3">
        <div className="card kpi-card">
          <div className="kpi-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
          </div>
          <div className="kpi-label">Total Customer</div>
          <div className="kpi-value">{totalCustomers.toLocaleString("id-ID")}</div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m9 12 2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <div className="kpi-label">Customer Aktif</div>
          <div className="kpi-value">{activeCustomers.toLocaleString("id-ID")}</div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon points">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2l2.8 6.6L21 9.4l-5 4.4 1.5 6.6L12 17l-5.5 3.4L8 13.8l-5-4.4 6.2-.8Z" />
            </svg>
          </div>
          <div className="kpi-label">Points in Circulation</div>
          <div className="kpi-value">{totalPointsCirculating.toLocaleString("id-ID")}</div>
        </div>
      </div>

      <div className="card mt-20">
        <div className="card-title-row">
          <h3>Customer Directory</h3>
          <span className="muted">{customers.length} pelanggan</span>
        </div>

        <div className="products-toolbar">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              placeholder="Cari nama, telepon, atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
            <option value={ALL_TIERS}>Semua Tier</option>
            {tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Kontak</th>
              <th>Membership Tier</th>
              <th>Total Poin</th>
              <th>Last Visit</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="empty-row">Memuat data...</td>
              </tr>
            )}
            {!isLoading &&
              customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="customer-cell">
                      <div className="avatar-circle">{initialsOf(c.name)}</div>
                      <div className="c-name">{c.name}</div>
                    </div>
                  </td>
                  <td>
                    <div className="c-contact">
                      <div>{c.phone ?? "-"}</div>
                      <div className="c-email">{c.email ?? "-"}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`tier-pill ${c.membershipTierId ? tierColorClass.get(c.membershipTierId) : ""}`}>
                      {c.membershipTierName ?? "—"}
                    </span>
                  </td>
                  <td>{c.totalPoints.toLocaleString("id-ID")} pts</td>
                  <td>{formatLastVisit(c.lastVisit)}</td>
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
                    <button className="icon-btn danger" onClick={() => handleDelete(c.id)} title="Hapus pelanggan">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            {!isLoading && customers.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-row">Tidak ada pelanggan yang cocok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Tambah Pelanggan Baru</h3>
            <form onSubmit={handleAddCustomer} className="customer-form">
              <label>Nama Lengkap</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth. Rina Wijaya"
                required
              />

              <label>No. Telepon / Email</label>
              <input
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="0812-xxxx-xxxx atau nama@email.com"
              />

              {/* Tidak ada pilihan tier manual di sini secara sengaja — tier
                  di-assign otomatis ke tier terendah, naik sendiri seiring poin
                  bertambah lewat transaksi (modul Sales). Sesuai keputusan Iqbal. */}
              <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
                Pelanggan baru otomatis masuk tier terendah ({tiers[0]?.name ?? "—"}) dan naik sendiri seiring poin bertambah.
              </p>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}