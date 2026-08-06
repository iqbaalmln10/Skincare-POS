import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import "./EmployeesPage.css";

interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "admin" | "kasir";
  isActive: boolean;
  onDuty: boolean;
  lastClockIn: string | null;
}

interface ActivityLog {
  id: number;
  employeeName: string;
  action: string;
  time: string;
}

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// Backend menyimpan waktu sebagai 'YYYY-MM-DD HH:MM:SS' atau ISO — samakan
// dulu ke format yang bisa diparse Date() dengan aman.
function formatDateTimeID(raw: string | null) {
  if (!raw) return "Belum pernah";
  const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "kasir" as "admin" | "kasir",
    password: "",
  });

  function loadEmployees() {
    setIsLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/employees`),
      axios.get(`${API_BASE}/employees/activity-log`),
    ])
      .then(([empRes, logRes]) => {
        setEmployees(empRes.data.data);
        setLogs(logRes.data.data);
        setErrorMsg(null);
      })
      .catch(() => setErrorMsg("Gagal memuat data karyawan dari server"))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const filtered = useMemo(() => {
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [employees, search]);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.isActive).length;
  const onDutyNow = employees.filter((e) => e.onDuty).length;

  function resetForm() {
    setForm({ name: "", email: "", phone: "", role: "kasir", password: "" });
    setFormError(null);
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return;

    setSaving(true);
    setFormError(null);
    try {
      const res = await axios.post(`${API_BASE}/employees`, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
        password: form.password,
      });

      setEmployees((prev) => [res.data.data, ...prev]);
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Gagal menyimpan karyawan");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: number) {
    try {
      const res = await axios.patch(`${API_BASE}/employees/${id}/status`);
      setEmployees((prev) => prev.map((e) => (e.id === id ? res.data.data : e)));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal mengubah status karyawan");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Yakin ingin menghapus karyawan ini?")) return;

    try {
      await axios.delete(`${API_BASE}/employees/${id}`);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Gagal menghapus karyawan");
    }
  }

  return (
    <>
      <div className="page-head-row">
        <div className="page-head">
          <h1>Employee Management</h1>
          <p>Kelola akun, peran, dan status karyawan Downtown Branch</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Employee
          </button>
        )}
      </div>

      {errorMsg && <p className="settings-msg error">{errorMsg}</p>}

      <div className="grid-3">
        <div className="card kpi-card">
          <div className="kpi-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="kpi-label">Total Karyawan</div>
          <div className="kpi-value">{totalEmployees}</div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m9 12 2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <div className="kpi-label">Akun Aktif</div>
          <div className="kpi-value">{activeEmployees}</div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon duty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </div>
          <div className="kpi-label">Sedang Bertugas</div>
          <div className="kpi-value">{onDutyNow}</div>
        </div>
      </div>

      <div className="grid-2 mt-20 employees-grid">
        <div className="card">
          <div className="card-title-row">
            <h3>Daftar Karyawan</h3>
            <span className="muted">{filtered.length} orang</span>
          </div>

          <div className="search-box employees-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Peran</th>
                <th>Terakhir Clock-in</th>
                <th>Status</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="empty-row">Memuat data...</td>
                </tr>
              )}
              {!isLoading &&
                filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div className="employee-cell">
                        <div className={`avatar-circle${emp.onDuty ? " on-duty" : ""}`}>
                          {initialsOf(emp.name)}
                          {emp.onDuty && <span className="duty-dot" />}
                        </div>
                        <div>
                          <div className="e-name">{emp.name}</div>
                          <div className="e-email">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-pill ${emp.role}`}>
                        {emp.role === "admin" ? "Administrator" : "Kasir"}
                      </span>
                    </td>
                    <td>{formatDateTimeID(emp.lastClockIn)}</td>
                    <td>
                      {isAdmin ? (
                        <button
                          className={`status-toggle${emp.isActive ? " active" : ""}`}
                          onClick={() => toggleActive(emp.id)}
                          title="Klik untuk ubah status"
                        >
                          {emp.isActive ? "Aktif" : "Nonaktif"}
                        </button>
                      ) : (
                        <span className={`status-toggle${emp.isActive ? " active" : ""}`}>
                          {emp.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <button className="icon-btn danger" onClick={() => handleDelete(emp.id)} title="Hapus karyawan">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="empty-row">Tidak ada karyawan yang cocok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-title-row">
            <h3>Activity Log</h3>
            <span className="muted">Terbaru</span>
          </div>
          <div className="activity-list">
            {logs.map((log) => (
              <div className="activity-item" key={log.id}>
                <div className="activity-dot" />
                <div className="activity-body">
                  <div className="activity-text">
                    <strong>{log.employeeName}</strong> — {log.action}
                  </div>
                  <div className="activity-time">{formatDateTimeID(log.time)}</div>
                </div>
              </div>
            ))}
            {logs.length === 0 && !isLoading && (
              <p className="muted">Belum ada aktivitas.</p>
            )}
          </div>
        </div>
      </div>

      {showModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Tambah Karyawan Baru</h3>
            {formError && <p className="settings-msg error">{formError}</p>}
            <form onSubmit={handleAddEmployee} className="employee-form">
              <label>Nama Lengkap</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth. Rina Wijaya"
                required
              />

              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nama@skincarepos.local"
                required
              />

              <label>No. Telepon</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0812-xxxx-xxxx"
              />

              <label>Peran</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "kasir" })}
              >
                <option value="kasir">Kasir</option>
                <option value="admin">Administrator</option>
              </select>

              <label>Password Awal</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
              />

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan Karyawan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
