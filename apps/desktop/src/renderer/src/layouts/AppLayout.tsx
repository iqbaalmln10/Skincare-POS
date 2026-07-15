import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./AppLayout.css";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="brand">Skincare POS</div>
          <div className="tag">Point of Sale System</div>
        </div>

        <nav className="nav-group">
          <NavLink to="/dashboard" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            Dashboard
          </NavLink>
          <NavLink to="/sales" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6" />
              <circle cx="9" cy="21" r="1" />
              <circle cx="18" cy="21" r="1" />
            </svg>
            Sales
          </NavLink>
          <NavLink to="/purchases" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 7h-9M14 17H5M17 3l3 4-3 4M7 21l-3-4 3-4" />
            </svg>
            Purchases
          </NavLink>
          <NavLink to="/products" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20.5 7.3 12 3 3.5 7.3 12 11.6l8.5-4.3ZM3.5 7.3v9.4L12 21l8.5-4.3V7.3M12 11.6V21" />
            </svg>
            Products
          </NavLink>
          <NavLink to="/employees" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Employees
          </NavLink>
          <NavLink to="/customers" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
            Customers
          </NavLink>
          <NavLink to="/discounts" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20.6 12.5 12.5 20.6a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1 0-2.8L10.7 2.7a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v6.8c0 .5-.2 1-.6 1.4Z" />
              <circle cx="15" cy="8" r="1.4" />
            </svg>
            Discounts
          </NavLink>
          <NavLink to="/reports" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 19V6a1 1 0 0 1 1-1h9l5 5v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
              <path d="M9 17v-5M13 17v-8M17 17v-3" />
            </svg>
            Reports
          </NavLink>
        </nav>

        <div className="sidebar-foot">
          <NavLink to="/settings" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V9c.2.7.8 1.2 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
            Settings
          </NavLink>
          <a className="nav-item" href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            Logout
          </a>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <div className="branch-pill">
              <span className="dot" />
              Downtown Branch
              <span className="sub">· {dateFmt}</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className={`shift-badge${user?.shiftId ? "" : " off"}`}>
              <span className="dot" />
              {user?.shiftId ? "Shift Aktif" : "Belum Clock-in"}
            </div>
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