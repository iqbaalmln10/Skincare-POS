import { useMemo, useState } from "react";
import "./ReportsPage.css";

type ReportType = "sales" | "inventory" | "employee";

// 🔶 DATA DUMMY — state lokal saja, belum nyambung ke backend/database
const salesRows = [
  { date: "2025-10-20", trxNo: "TRX-8801", cashier: "Sarah Miller", items: 3, total: 267000 },
  { date: "2025-10-20", trxNo: "TRX-8802", cashier: "Elena Marco", items: 1, total: 89000 },
  { date: "2025-10-19", trxNo: "TRX-8795", cashier: "Sarah Miller", items: 5, total: 542000 },
  { date: "2025-10-19", trxNo: "TRX-8790", cashier: "Alan Chen", items: 2, total: 154000 },
  { date: "2025-10-18", trxNo: "TRX-8781", cashier: "Elena Marco", items: 4, total: 328000 },
];

const inventoryRows = [
  { name: "Radiance Rose Serum", category: "Serum", stock: 42, costPrice: 45000 },
  { name: "Deep Sea Hydra Cream", category: "Moisturizer", stock: 8, costPrice: 62000 },
  { name: "Detox Charcoal Mask", category: "Mask", stock: 27, costPrice: 38000 },
  { name: "Hydro Marine Cleanser", category: "Cleanser", stock: 4, costPrice: 30000 },
  { name: "Botanical Oil Cleanser", category: "Cleanser", stock: 60, costPrice: 33000 },
];

const employeeRows = [
  { name: "Sarah Miller", trxCount: 58, totalSales: 6420000 },
  { name: "Elena Marco", trxCount: 44, totalSales: 4980000 },
  { name: "Alan Chen", trxCount: 31, totalSales: 3105000 },
];

function formatRp(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}
function formatDateID(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const REPORT_TABS: { key: ReportType; label: string }[] = [
  { key: "sales", label: "Sales Report" },
  { key: "inventory", label: "Inventory Report" },
  { key: "employee", label: "Employee Performance" },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>("sales");
  const [startDate, setStartDate] = useState("2025-10-01");
  const [endDate, setEndDate] = useState("2025-10-24");

  const filteredSales = useMemo(
    () => salesRows.filter((r) => r.date >= startDate && r.date <= endDate),
    [startDate, endDate]
  );

  const salesStats = useMemo(() => {
    const totalSales = filteredSales.reduce((s, r) => s + r.total, 0);
    const totalTrx = filteredSales.length;
    const avg = totalTrx > 0 ? Math.round(totalSales / totalTrx) : 0;
    return { totalSales, totalTrx, avg };
  }, [filteredSales]);

  const inventoryStats = useMemo(() => {
    const totalSku = inventoryRows.length;
    const totalStockValue = inventoryRows.reduce((s, r) => s + r.stock * r.costPrice, 0);
    const lowStock = inventoryRows.filter((r) => r.stock <= 10).length;
    return { totalSku, totalStockValue, lowStock };
  }, []);

  const employeeStats = useMemo(() => {
    const totalTrx = employeeRows.reduce((s, r) => s + r.trxCount, 0);
    const top = [...employeeRows].sort((a, b) => b.totalSales - a.totalSales)[0];
    return { totalTrx, top };
  }, []);

  function handleExport() {
    if (activeTab === "sales") {
      downloadCSV(
        `sales-report_${startDate}_${endDate}.csv`,
        ["Tanggal", "No. Transaksi", "Kasir", "Jumlah Item", "Total"],
        filteredSales.map((r) => [formatDateID(r.date), r.trxNo, r.cashier, r.items, r.total])
      );
    } else if (activeTab === "inventory") {
      downloadCSV(
        "inventory-report.csv",
        ["Produk", "Kategori", "Stok", "Harga Modal", "Nilai Stok"],
        inventoryRows.map((r) => [r.name, r.category, r.stock, r.costPrice, r.stock * r.costPrice])
      );
    } else {
      downloadCSV(
        "employee-performance-report.csv",
        ["Karyawan", "Jumlah Transaksi", "Total Penjualan"],
        employeeRows.map((r) => [r.name, r.trxCount, r.totalSales])
      );
    }
  }

  return (
    <>
      <div className="page-head-row">
        <div className="page-head">
          <h1>Reports</h1>
          <p>Analisis penjualan, stok, dan performa karyawan Downtown Branch</p>
        </div>
        <button className="btn btn-primary" onClick={handleExport}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={15} height={15}>
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="report-tabs">
        {REPORT_TABS.map((t) => (
          <button
            key={t.key}
            className={`report-tab${activeTab === t.key ? " active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "sales" && (
        <>
          <div className="card date-range-card mt-20">
            <label>Dari</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <label>Sampai</label>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="grid-3 mt-20">
            <div className="card kpi-card">
              <div className="kpi-label">Total Transaksi</div>
              <div className="kpi-value">{salesStats.totalTrx}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Total Penjualan</div>
              <div className="kpi-value">{formatRp(salesStats.totalSales)}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Rata-rata / Transaksi</div>
              <div className="kpi-value">{formatRp(salesStats.avg)}</div>
            </div>
          </div>

          <div className="card mt-20">
            <div className="card-title-row">
              <h3>Detail Transaksi</h3>
              <span className="muted">{filteredSales.length} baris</span>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Tanggal</th><th>No. Transaksi</th><th>Kasir</th><th>Jumlah Item</th><th>Total</th></tr>
              </thead>
              <tbody>
                {filteredSales.map((r) => (
                  <tr key={r.trxNo}>
                    <td>{formatDateID(r.date)}</td>
                    <td>{r.trxNo}</td>
                    <td>{r.cashier}</td>
                    <td>{r.items}</td>
                    <td>{formatRp(r.total)}</td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr><td colSpan={5} className="empty-row">Tidak ada transaksi di rentang tanggal ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "inventory" && (
        <>
          <div className="grid-3 mt-20">
            <div className="card kpi-card">
              <div className="kpi-label">Total SKU</div>
              <div className="kpi-value">{inventoryStats.totalSku}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Total Nilai Stok</div>
              <div className="kpi-value">{formatRp(inventoryStats.totalStockValue)}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Produk Stok Rendah</div>
              <div className="kpi-value">{inventoryStats.lowStock}</div>
            </div>
          </div>

          <div className="card mt-20">
            <div className="card-title-row">
              <h3>Nilai Stok per Produk</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Produk</th><th>Kategori</th><th>Stok</th><th>Harga Modal</th><th>Nilai Stok</th></tr>
              </thead>
              <tbody>
                {inventoryRows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.category}</td>
                    <td>
                      <span className={`stock-pill${r.stock <= 10 ? " low" : ""}`}>{r.stock} pcs</span>
                    </td>
                    <td>{formatRp(r.costPrice)}</td>
                    <td>{formatRp(r.stock * r.costPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "employee" && (
        <>
          <div className="grid-2 mt-20">
            <div className="card kpi-card">
              <div className="kpi-label">Total Transaksi Semua Kasir</div>
              <div className="kpi-value">{employeeStats.totalTrx}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Top Performer</div>
              <div className="kpi-value kpi-value-sm">{employeeStats.top?.name}</div>
            </div>
          </div>

          <div className="card mt-20">
            <div className="card-title-row">
              <h3>Performa per Karyawan</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Karyawan</th><th>Jumlah Transaksi</th><th>Total Penjualan</th></tr>
              </thead>
              <tbody>
                {employeeRows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.trxCount}</td>
                    <td>{formatRp(r.totalSales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}