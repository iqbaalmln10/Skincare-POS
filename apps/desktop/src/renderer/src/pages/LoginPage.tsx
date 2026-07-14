import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import "./LoginPage.css";

export default function LoginPage() {
  const { tapRfid, loginPassword, isLoading } = useAuth();
  const rfidRef = useRef<HTMLInputElement>(null);

  const [rfidBuffer, setRfidBuffer] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [now, setNow] = useState(new Date());
  const [message, setMessage] = useState<{
    text: string;
    type: "info" | "error";
  } | null>(null);

  // Jam real-time di pojok kanan atas
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Selalu fokus ke input RFID tersembunyi saat mode tap kartu aktif
  useEffect(() => {
    if (!showManual) rfidRef.current?.focus();
  }, [showManual]);

  // Handle tap kartu RFID — reader mengirim UID lalu Enter
  async function handleRfidKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const uid = rfidBuffer.trim();
      setRfidBuffer("");

      if (!uid) return;

      try {
        const result = await tapRfid(uid);
        setMessage({
          text:
            result.action === "login"
              ? "Login berhasil, selamat bekerja!"
              : "Logout berhasil.",
          type: "info",
        });
      } catch (err: any) {
        setMessage({
          text: err.response?.data?.message || "Kartu tidak dikenali",
          type: "error",
        });
      }
    }
  }

  // Handle login manual (email + password) — untuk admin / fallback
  async function handleManualLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await loginPassword(email, password);
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || "Email atau password salah",
        type: "error",
      });
    }
  }

  const dateFmt = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeFmt = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="login-screen">
      <div className="login-topbar">
        <div className="brand">
          <span className="name">Skincare POS</span>
          <span className="tag">Point of Sale System</span>
        </div>
        <div className="clock">
          <div>
            <strong>{dateFmt}</strong>
          </div>
          <div>{timeFmt}</div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-branch-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          Downtown Branch
        </div>

        {/* Input RFID tersembunyi — selalu fokus saat mode tap kartu aktif,
            reader RFID mengetik UID ke sini lalu mengirim Enter */}
        {!showManual && (
          <input
            ref={rfidRef}
            className="rfid-hidden-input"
            value={rfidBuffer}
            onChange={(e) => setRfidBuffer(e.target.value)}
            onKeyDown={handleRfidKeyDown}
            onBlur={() => rfidRef.current?.focus()}
            aria-label="Input RFID"
            autoComplete="off"
          />
        )}

        <div className="rfid-scan">
          <div className={`rfid-ring ${isLoading ? "busy" : "pulse"}`} />
          {!isLoading && <div className="rfid-ring pulse delay" />}
          <div className="rfid-core">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M8.5 8.5a5 5 0 0 1 7 0M6 6a9 9 0 0 1 12 0M12 12h.01M10 15a3 3 0 0 1 4 0" />
            </svg>
          </div>
        </div>

        {!showManual && (
          <>
            <h2>{isLoading ? "Memproses..." : "Scan RFID to Start"}</h2>
            <p className="hint">Tempelkan kartu RFID karyawan untuk clock-in otomatis</p>
          </>
        )}

        {message && (
          <p className={`login-message ${message.type}`}>{message.text}</p>
        )}

        <div className="login-divider">atau login manual</div>

        {!showManual ? (
          <button className="login-toggle-btn" onClick={() => setShowManual(true)}>
            Login manual (admin) →
          </button>
        ) : (
          <>
            <button className="login-toggle-btn" onClick={() => setShowManual(false)}>
              ← Kembali ke tap kartu
            </button>

            <form className="manual-form" onSubmit={handleManualLogin}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="nama@skincarepos.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button className="btn btn-primary btn-block" type="submit" disabled={isLoading}>
                {isLoading ? "Memproses..." : "Masuk →"}
              </button>
            </form>
          </>
        )}

        <div className="login-footnote">Lupa password? Hubungi administrator sistem.</div>
      </div>
    </div>
  );
}