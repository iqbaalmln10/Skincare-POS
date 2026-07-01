import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { tapRfid, loginPassword, isLoading } = useAuth();
  const rfidRef = useRef<HTMLInputElement>(null);

  const [rfidBuffer, setRfidBuffer] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    type: "info" | "error";
  } | null>(null);

  // Selalu fokus ke input RFID saat halaman aktif
  useEffect(() => {
    if (!showManual) rfidRef.current?.focus();
  }, [showManual]);

  // Handle tap kartu RFID
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

  // Handle login manual (password)
  async function handleManualLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await loginPassword(email, password);
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || "Login gagal",
        type: "error",
      });
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Skincare POS</h1>
        <p style={styles.subtitle}>Tempelkan kartu untuk masuk</p>

        {/* Input RFID — transparan, selalu fokus, user tidak perlu lihat ini */}
        {!showManual && (
          <input
            ref={rfidRef}
            value={rfidBuffer}
            onChange={(e) => setRfidBuffer(e.target.value)}
            onKeyDown={handleRfidKeyDown}
            onBlur={() => rfidRef.current?.focus()} // paksa tetap fokus
            style={styles.rfidInput}
            aria-label="Input RFID"
            autoComplete="off"
          />
        )}

        {/* Ikon kartu */}
        <div style={styles.cardIcon}>🪪</div>

        {isLoading && <p style={styles.loading}>Memproses...</p>}

        {message && (
          <p
            style={{
              ...styles.message,
              color: message.type === "error" ? "#e53e3e" : "#2f855a",
            }}
          >
            {message.text}
          </p>
        )}

        {/* Toggle login manual */}
        <button style={styles.linkBtn} onClick={() => setShowManual((v) => !v)}>
          {showManual ? "← Kembali ke tap kartu" : "Login manual (admin)"}
        </button>

        {showManual && (
          <form onSubmit={handleManualLogin} style={styles.form}>
            <input
              style={styles.input}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button style={styles.btn} type="submit" disabled={isLoading}>
              {isLoading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#f7fafc",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "48px 40px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    textAlign: "center",
    width: 360,
  },
  title: { fontSize: 24, fontWeight: 700, color: "#1a202c", margin: "0 0 8px" },
  subtitle: { color: "#718096", marginBottom: 32 },
  rfidInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
    pointerEvents: "none",
  },
  cardIcon: { fontSize: 64, marginBottom: 24 },
  loading: { color: "#718096", fontSize: 14 },
  message: { fontSize: 14, marginTop: 12 },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#3182ce",
    cursor: "pointer",
    fontSize: 14,
    marginTop: 16,
    textDecoration: "underline",
  },
  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 20 },
  input: {
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
  },
  btn: {
    padding: "11px 0",
    background: "#2b6cb0",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
};
