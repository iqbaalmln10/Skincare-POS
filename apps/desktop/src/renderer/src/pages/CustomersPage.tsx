import { useMemo, useState } from "react";
import "./CustomersPage.css";

type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  tier: Tier;
  totalPoints: number;
  lastVisit: string;
  isActive: boolean;
}

// 🔶 DATA DUMMY — state lokal saja, belum nyambung ke backend/database
const initialCustomers: Customer[] = [
  { id: 1, name: "Isabella Chen", phone: "0812-1111-2222", email: "isabella@mail.com", tier: "Platinum", totalPoints: 15420, lastVisit: "3 hari lalu", isActive: true },
  { id: 2, name: "Deep Sea Hydra Ko", phone: "0813-2222-3333", email: "deepsea@mail.com", tier: "Gold", totalPoints: 8230, lastVisit: "1 minggu lalu", isActive: true },
  { id: 3, name: "Dellan Charcoal Mon", phone: "0821-3333-4444", email: "dellan@mail.com", tier: "Silver", totalPoints: 3120, lastVisit: "2 minggu lalu", isActive: true },
  { id: 4, name: "Hydro Marine Wijaya", phone: "0857-4444-5555", email: "hydro.marine@mail.com", tier: "Gold", totalPoints: 6890, lastVisit: "5 hari lalu", isActive: true },
  { id: 5, name: "Botanical Oil Santoso", phone: "0878-5555-6666", email: "botanical@mail.com", tier: "Bronze", totalPoints: 640, lastVisit: "1 bulan lalu", isActive: false },
];

const TIER_OPTIONS: Tier[] = ["Bronze", "Silver", "Gold", "Platinum"];
const TIER_FILTER_OPTIONS = ["Semua Tier", ...TIER_OPTIONS];

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("Semua Tier");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    tier: "Bronze" as Tier,
  });

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchTier = tierFilter === "Semua Tier" || c.tier === tierFilter;
      return matchSearch && matchTier;
    });
  }, [customers, search, tierFilter]);

  const totalCustomers = customers.length;
  const totalPointsCirculating = customers.reduce((sum, c) => sum + c.totalPoints, 0);
  const activeCustomers = customers.filter((c) => c.isActive).length;

  function resetForm() {
    setForm({ name: "", phone: "", email: "", tier: "Bronze" });
  }

  function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const newCustomer: Customer = {
      id: Math.max(0, ...customers.map((c) => c.id)) + 1,
      name: form.name.trim(),
      phone: form.phone.trim() || "-",
      email: form.email.trim() || "-",
      tier: form.tier,
      totalPoints: 0,
      lastVisit: "Belum pernah",
      isActive: true,
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    resetForm();
    setShowModal(false);
  }

  function toggleActive(id: number) {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  }

  function handleDelete(id: number) {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
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
          <span className="muted">{filtered.length} pelanggan</span>
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
            {TIER_FILTER_OPTIONS.map((t) => (
              <option key={t}>{t}</option>
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
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="customer-cell">
                    <div className="avatar-circle">{initialsOf(c.name)}</div>
                    <div className="c-name">{c.name}</div>
                  </div>
                </td>
                <td>
                  <div className="c-contact">
                    <div>{c.phone}</div>
                    <div className="c-email">{c.email}</div>
                  </div>
                </td>
                <td>
                  <span className={`tier-pill tier-${c.tier.toLowerCase()}`}>{c.tier}</span>
                </td>
                <td>{c.totalPoints.toLocaleString("id-ID")} pts</td>
                <td>{c.lastVisit}</td>
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
            {filtered.length === 0 && (
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

              <label>No. Telepon</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0812-xxxx-xxxx"
              />

              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nama@email.com"
              />

              <label>Membership Tier</label>
              <select
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value as Tier })}
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>

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