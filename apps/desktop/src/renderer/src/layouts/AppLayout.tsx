import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import { API_BASE } from "../lib/api";
import { StoreSettings, STORE_KEY, defaultStore, loadJSON } from "../lib/settings";
import logo from "../assets/logo.png";
import "./AppLayout.css";

interface AttendanceStatus {
  onDuty: boolean;
  clockedInToday: boolean;
  clockedOutToday: boolean;
  shiftId: number | null;
}

// Jam kerja: tombol Absen Masuk tampil mulai jam 7 pagi, tombol Absen Pulang
// tampil mulai jam 5 sore (17:00). Di luar jam ini / setelah absen, tombol hilang.
const WORK_START_HOUR = 7;
const WORK_END_HOUR = 17;

export default function AppLayout() {
  const { user, logout, refreshSession } = useAuth();
  const [now, setNow] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [store] = useState<StoreSettings>(() => loadJSON(STORE_KEY, defaultStore));

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendanceStatus = useCallback(() => {
    if (!user || user.role === "admin") return;
    axios
      .get(`${API_BASE}/attendance/status`)
      .then((res) => setAttendance(res.data.data))
      .catch(() => {
        /* status gagal dimuat — tombol absensi cukup disembunyikan */
      });
  }, [user]);

  useEffect(() => {
    loadAttendanceStatus();
    // Poll tiap 30 detik supaya tombol muncul/hilang otomatis saat jam kerja berubah
    // tanpa perlu reload halaman.
    const poll = setInterval(loadAttendanceStatus, 30000);
    return () => clearInterval(poll);
  }, [loadAttendanceStatus]);

  const initials = (user?.name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const dateFmt = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav-item${isActive ? " active" : ""}`;

  const currentHour = now.getHours();
  const isAdmin = user?.role === "admin";
  // Kasir hanya boleh mengakses Dasbor, Penjualan, dan Pelanggan — menu lain
  // (Pembelian, Pengeluaran, Suppliers, Produk, Karyawan, Diskon, Laporan,
  // Pengaturan) disembunyikan dari sidebar. Endpoint sensitif (laporan,
  // ringkasan finansial bulanan) juga dikunci admin only di backend.
  const showClockIn =
    !isAdmin &&
    !!attendance &&
    !attendance.onDuty &&
    !attendance.clockedInToday &&
    currentHour >= WORK_START_HOUR;
  const showClockOut = !isAdmin && !!attendance && attendance.onDuty && currentHour >= WORK_END_HOUR;

  async function handleClockIn() {
    setBusy(true);
    setAttendanceError(null);
    try {
      const res = await axios.post(`${API_BASE}/attendance/clock-in`);
      const { token, shiftId } = res.data.data;
      refreshSession(token, shiftId);
      loadAttendanceStatus();
    } catch (err: any) {
      setAttendanceError(err.response?.data?.message || "Gagal absen masuk");
    } finally {
      setBusy(false);
    }
  }

  async function handleClockOut() {
    setBusy(true);
    setAttendanceError(null);
    try {
      const res = await axios.post(`${API_BASE}/attendance/clock-out`);
      const { token, shiftId } = res.data.data;
      refreshSession(token, shiftId);
      loadAttendanceStatus();
    } catch (err: any) {
      setAttendanceError(err.response?.data?.message || "Gagal absen pulang");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="By Me" className="sidebar-logo-img" />
          <div>
            <div className="brand">By Me</div>
            <div className="tag">Sistem Kasir</div>
          </div>
        </div>

        <nav className="nav-group">
          <NavLink to="/dashboard" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            Dasbor
          </NavLink>
          <NavLink to="/sales" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6" />
              <circle cx="9" cy="21" r="1" />
              <circle cx="18" cy="21" r="1" />
            </svg>
            Penjualan
          </NavLink>
          {isAdmin && (
            <NavLink to="/purchases" className={navClass}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M20 7h-9M14 17H5M17 3l3 4-3 4M7 21l-3-4 3-4" />
              </svg>
              Pembelian
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/expenses" className={navClass}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M20 12H4M4 12l6-6M4 12l6 6" />
              </svg>
              Pengeluaran
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/suppliers" className={navClass}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 9l2-5h14l2 5M5 9v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V9M5 9h14" />
              </svg>
              Suppliers
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/products" className={navClass}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M20.5 7.3 12 3 3.5 7.3 12 11.6l8.5-4.3ZM3.5 7.3v9.4L12 21l8.5-4.3V7.3M12 11.6V21" />
              </svg>
              Produk
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/employees" className={navClass}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Karyawan
            </NavLink>
          )}
          <NavLink to="/customers" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
            Pelanggan
          </NavLink>
          {isAdmin && (
            <NavLink to="/discounts" className={navClass}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M20.6 12.5 12.5 20.6a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1 0-2.8L10.7 2.7a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v6.8c0 .5-.2 1-.6 1.4Z" />
                <circle cx="15" cy="8" r="1.4" />
              </svg>
              Diskon
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/reports" className={navClass}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 19V6a1 1 0 0 1 1-1h9l5 5v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
                <path d="M9 17v-5M13 17v-8M17 17v-3" />
              </svg>
              Laporan
            </NavLink>
          )}
        </nav>

        <div className="sidebar-foot">
          {isAdmin && (
            <NavLink to="/settings" className={navClass}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V9c.2.7.8 1.2 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
              </svg>
              Pengaturan
            </NavLink>
          )}
          <a className="nav-item" href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            Keluar
          </a>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <div className="branch-pill">
              <span className="dot" />
              {store.storeName}
              <span className="sub">· {dateFmt}</span>
            </div>
          </div>
          <div className="topbar-right">
            {attendanceError && <span className="attendance-error">{attendanceError}</span>}

            {showClockIn && (
              <button className="attendance-btn clock-in" onClick={handleClockIn} disabled={busy}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
                {busy ? "Memproses..." : "Absen Masuk"}
              </button>
            )}

            {showClockOut && (
              <button className="attendance-btn clock-out" onClick={handleClockOut} disabled={busy}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5M21 12H9" />
                </svg>
                {busy ? "Memproses..." : "Absen Pulang"}
              </button>
            )}

            {!isAdmin && (
              <div className={`shift-badge${user?.shiftId ? "" : " off"}`}>
                <span className="dot" />
                {user?.shiftId ? "Shift Aktif" : "Belum Clock-in"}
              </div>
            )}
            <div className="user-chip">
              <div className="avatar">{initials}</div>
              <div className="who">
                <div className="name">{user?.name}</div>
                <div className="role">{user?.role === "admin" ? "Administrator" : "Kasir"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}