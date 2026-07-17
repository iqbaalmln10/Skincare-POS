import { useMemo, useState } from "react";
import "./EmployeesPage.css";

interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "kasir";
  isActive: boolean;
  onDuty: boolean;
  lastClockIn: string;
}

interface ActivityLog {
  id: number;
  employeeName: string;
  action: string;
  time: string;
}

// 🔶 DATA DUMMY — state lokal saja, belum nyambung ke backend/database
const initialEmployees: Employee[] = [
  { id: 1, name: "Sarah Miller", email: "sarah@skincarepos.local", phone: "0812-3456-7890", role: "kasir", isActive: true, onDuty: true, lastClockIn: "Hari ini, 08:02" },
  { id: 2, name: "Elena Marco", email: "elena@skincarepos.local", phone: "0813-2233-4455", role: "kasir", isActive: true, onDuty: true, lastClockIn: "Hari ini, 09:15" },
  { id: 3, name: "Alan Chen", email: "alan@skincarepos.local", phone: "0821-9988-7766", role: "kasir", isActive: true, onDuty: false, lastClockIn: "Kemarin, 17:40" },
  { id: 4, name: "Administrator", email: "admin@skincarepos.local", phone: "0811-0000-0001", role: "admin", isActive: true, onDuty: false, lastClockIn: "2 hari lalu, 10:05" },
  { id: 5, name: "Michael Tanoto", email: "michael@skincarepos.local", phone: "0857-1122-3344", role: "kasir", isActive: false, onDuty: false, lastClockIn: "3 minggu lalu" },
];

const initialLogs: ActivityLog[] = [
  { id: 1, employeeName: "Elena Marco", action: "Clock-in via RFID", time: "09:15" },
  { id: 2, employeeName: "Sarah Miller", action: "Clock-in via RFID", time: "08:02" },
  { id: 3, employeeName: "Alan Chen", action: "Clock-out via RFID", time: "Kemarin, 17:40" },
  { id: 4, employeeName: "Alan Chen", action: "Clock-in via RFID", time: "Kemarin, 09:00" },
  { id: 5, employeeName: "Administrator", action: "Menambahkan produk baru", time: "2 hari lalu" },
];

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [logs] = useState<ActivityLog[]>(initialLogs);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "kasir" as "admin" | "kasir",
    password: "",
  });

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
  }

  function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return;

    const newEmployee: Employee = {
      id: Math.max(0, ...employees.map((e) => e.id)) + 1,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || "-",
      role: form.role,
      isActive: true,
      onDuty: false,
      lastClockIn: "Belum pernah",
    };

    setEmployees((prev) => [newEmployee, ...prev]);
    resetForm();
    setShowModal(false);
  }

  function toggleActive(id: number) {
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isActive: !e.isActive, onDuty: e.isActive ? false : e.onDuty } : e))
    );
  }

  function handleDelete(id: number) {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <>
      <div className="page-head-row">
        <div className="page-head">
          <h1>Employee Management</h1>
          <p>Kelola akun, peran, dan status karyawan Downtown Branch</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add Employee
        </button>
      </div>

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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
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
                  <td>{emp.lastClockIn}</td>
                  <td>
                    <button
                      className={`status-toggle${emp.isActive ? " active" : ""}`}
                      onClick={() => toggleActive(emp.id)}
                      title="Klik untuk ubah status"
                    >
                      {emp.isActive ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td>
                    <button className="icon-btn danger" onClick={() => handleDelete(emp.id)} title="Hapus karyawan">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-row">Tidak ada karyawan yang cocok.</td>
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
                  <div className="activity-time">{log.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Tambah Karyawan Baru</h3>
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
                placeholder="••••••••"
                required
              />

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}