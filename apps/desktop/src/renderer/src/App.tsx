import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import ComingSoonPage from "./pages/ComingSoonPage";

function AppContent() {
  const { user } = useAuth();

  if (!user) return <LoginPage />;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="sales" element={<ComingSoonPage title="Sales" />} />
          <Route path="purchases" element={<ComingSoonPage title="Purchases" />} />
          <Route path="products" element={<ComingSoonPage title="Products" />} />
          <Route path="employees" element={<ComingSoonPage title="Employees" />} />
          <Route path="customers" element={<ComingSoonPage title="Customers" />} />
          <Route path="discounts" element={<ComingSoonPage title="Discounts" />} />
          <Route path="reports" element={<ComingSoonPage title="Reports" />} />
          <Route path="settings" element={<ComingSoonPage title="Settings" />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}