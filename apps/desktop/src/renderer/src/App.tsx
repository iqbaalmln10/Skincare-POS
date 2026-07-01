import { useAuth } from "./hooks/useAuth";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";

function AppContent() {
  const { user } = useAuth();

  if (!user) return <LoginPage />;

  // Placeholder — ganti dengan Router + halaman Dashboard saat modul berikutnya dibuat
  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h2>Selamat datang, {user.name}</h2>
      <p>Role: {user.role} | Shift ID: {user.shiftId}</p>
      <p style={{ color: "#718096" }}>Dashboard & modul lain akan dibangun di sini.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}