import { createContext, useState, useCallback, ReactNode } from "react";
import axios from "axios";

const API = "http://localhost:4000/api";

export interface AuthUser {
  userId: number;
  role: "admin" | "kasir";
  shiftId: number | null;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  loginPassword: (email: string, password: string) => Promise<void>;
  logout: () => void;
  // Dipanggil setelah absen masuk/pulang manual (tombol UI) berhasil —
  // token baru dari backend membawa shiftId terkini, jadi state user perlu di-refresh.
  refreshSession: (token: string, shiftId: number | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Login manual (email + password) — satu-satunya cara masuk ke aplikasi.
  const loginPassword = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      const { token: newToken, user: userData, shiftId } = res.data.data;

      setToken(newToken);
      setUser({ userId: userData.id, role: userData.role, shiftId, name: userData.name });
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  }, []);

  const refreshSession = useCallback((newToken: string, shiftId: number | null) => {
    setToken(newToken);
    setUser((prev) => (prev ? { ...prev, shiftId } : prev));
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, loginPassword, logout, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}