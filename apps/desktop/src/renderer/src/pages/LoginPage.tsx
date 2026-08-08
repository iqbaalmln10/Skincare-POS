import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/logo.png";
import "./LoginPage.css";

export default function LoginPage() {
  const { loginPassword, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [now, setNow] = useState(new Date());
  const [message, setMessage] = useState<{ text: string; type: "info" | "error" } | null>(null);

  // Jam real-time di pojok kanan atas
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleLogin(e: React.FormEvent) {
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
          <img src={logo} alt="By Me" className="brand-logo" />
          <div>
            <span className="name">By Me</span>
            <span className="tag">Sistem Kasir</span>
          </div>
        </div>
        <div className="clock">
          <div>
            <strong>{dateFmt}</strong>
          </div>
          <div>{timeFmt}</div>
        </div>
      </div>

      <div className="login-card">
        <img src={logo} alt="By Me" className="login-card-logo" />
        <h2>Selamat Datang</h2>
        <p className="hint">Masuk dengan akun karyawan untuk melanjutkan</p>

        {message && <p className={`login-message ${message.type}`}>{message.text}</p>}

        <form className="manual-form" onSubmit={handleLogin}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="nama@byme.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <label htmlFor="password">Kata Sandi</label>
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

        <div className="login-footnote">Lupa password? Hubungi administrator sistem.</div>
      </div>
    </div>
  );
}
