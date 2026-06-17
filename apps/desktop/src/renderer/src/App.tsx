import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:4000/api";

function App() {
  const [backendStatus, setBackendStatus] = useState<string>("Menghubungkan...");

  useEffect(() => {
    axios
      .get(`${API_BASE}/health`)
      .then((res) => setBackendStatus(res.data.message))
      .catch(() => setBackendStatus("Backend tidak terhubung — pastikan sudah dijalankan"));
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Skincare POS</h1>
      <p>Status backend: {backendStatus}</p>
      <p style={{ color: "#888" }}>
        Halaman ini placeholder — modul Dashboard, POS, Produk, dll akan
        dibangun di src/renderer/src/pages.
      </p>
    </div>
  );
}

export default App;
