import { useEffect, useState } from "react";
import "./PrinterSettingsModal.css";

interface PrinterSettingsModalProps {
  onClose: () => void;
}

export default function PrinterSettingsModal({ onClose }: PrinterSettingsModalProps) {
  const [ports, setPorts] = useState<{ path: string; manufacturer?: string; isLikelyBluetooth: boolean }[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);

  function loadPorts() {
    setIsLoading(true);
    window.electronAPI.printer
      .listPorts()
      .then(setPorts)
      .catch(() => setErrorMsg("Gagal mengambil daftar COM port"))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadPorts();
    window.electronAPI.printer.getSettings().then((s) => setSelected(s.comPort ?? ""));
  }, []);

  async function handleSave() {
    if (!selected) return;
    await window.electronAPI.printer.saveSettings(selected);
    onClose();
  }

  async function handleTestPrint() {
    if (!selected) return;
    await window.electronAPI.printer.saveSettings(selected);
    setTestStatus("testing");
    setTestError(null);
    try {
      const result = await window.electronAPI.printReceipt({
        storeName: "Skincare POS",
        address: "Test Print",
        phone: "-",
        transactionId: "TEST-PRINT",
        timestamp: new Date().toLocaleString("id-ID"),
        cashierName: "-",
        customer: "-",
        paymentMethod: "Tunai",
        items: [{ name: "Test Print", qty: 1, price: 0 }],
        subtotal: 0,
        discountAmount: 0,
        total: 0,
        change: 0,
        footerNote: "Test print berhasil",
      });
      if (result?.success) {
        setTestStatus("ok");
      } else {
        setTestStatus("error");
        setTestError(result?.message || "Gagal test print");
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestError(err?.message || "Gagal test print");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card printer-settings-card" onClick={(e) => e.stopPropagation()}>
        <h3>Pengaturan Printer</h3>
        <p className="printer-settings-hint">
          Pairing printer dulu lewat Windows Bluetooth Settings (status "Driver unavailable" itu normal,
          abaikan saja), baru pilih COM port-nya di bawah ini.
        </p>

        {errorMsg && <div className="printer-settings-error">{errorMsg}</div>}

        {isLoading ? (
          <p className="muted">Memuat daftar COM port...</p>
        ) : ports.length === 0 ? (
          <p className="muted">Tidak ada COM port terdeteksi. Pastikan printer sudah dipairing.</p>
        ) : (
          <div className="port-list">
            {ports.map((p) => (
              <label key={p.path} className="port-item">
                <input
                  type="radio"
                  name="port"
                  checked={selected === p.path}
                  onChange={() => setSelected(p.path)}
                />
                <span className="port-path">{p.path}</span>
                {p.isLikelyBluetooth && <span className="port-tag">Bluetooth</span>}
                {p.manufacturer && <span className="port-manufacturer">{p.manufacturer}</span>}
              </label>
            ))}
          </div>
        )}

        <button type="button" className="mini-btn" onClick={loadPorts}>
          Refresh daftar port
        </button>

        {testStatus !== "idle" && (
          <p className={`printer-test-status ${testStatus}`}>
            {testStatus === "testing" && "Mengirim test print..."}
            {testStatus === "ok" && "Test print terkirim — cek fisik printer."}
            {testStatus === "error" && (testError || "Gagal test print — cek koneksi/port yang dipilih.")}
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={handleTestPrint} disabled={!selected}>
            Test Print
          </button>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!selected}>
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
