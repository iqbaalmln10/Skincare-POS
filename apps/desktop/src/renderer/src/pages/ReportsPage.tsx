import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/api";
import {
  StoreSettings,
  STORE_KEY,
  defaultStore,
  loadJSON,
} from "../lib/settings";
import {
  exportAllReportsExcel,
  EmployeeAttendanceRow,
} from "../lib/exportReportsExcel";
import "./ReportsPage.css";

// "stockPurchase" = Laporan Stok + Laporan Pembelian digabung jadi satu tab.
// "employeeAttendance" = Performa Karyawan + Laporan Absensi digabung jadi satu tab.
type ReportType = "sales" | "stockPurchase" | "employeeAttendance" | "expense";

interface SalesRow {
  date: string;
  invoiceNumber: string;
  cashierName: string;
  itemCount: number;
  total: number;
}

interface InventoryRow {
  name: string;
  category: string | null;
  stock: number;
  costPrice: number;
}

interface EmployeeRow {
  name: string;
  trxCount: number;
  totalSales: number;
}

interface ExpenseRow {
  id: number;
  date: string;
  description: string;
  recordedBy: string;
  amount: number;
}

interface AttendanceRow {
  employeeId: number;
  employeeName: string;
  totalHadir: number;
  totalTerlambat: number;
  totalJamKerja: number;
  lastAttendance: string | null;
}

interface PurchaseRow {
  id: number;
  date: string;
  poNumber: string;
  supplierName: string | null;
  createdBy: string;
  status: "pending" | "received" | "cancelled";
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  totalAmount: number;
}

interface ProfitSummary {
  totalRevenue: number;
  totalStockPurchases: number;
  totalOperationalExpenses: number;
  netProfit: number;
}

function formatRp(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}
function formatDateID(d: string) {
  return new Date(d.replace(" ", "T")).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
// Dipakai untuk menerjemahkan filter "Bulan" di tab Karyawan & Absensi
// menjadi rentang startDate/endDate yang dipahami endpoint performa karyawan.
function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

const REPORT_TABS: { key: ReportType; label: string }[] = [
  { key: "sales", label: "Laporan Penjualan" },
  { key: "stockPurchase", label: "Stok & Pembelian" },
  { key: "employeeAttendance", label: "Karyawan & Absensi" },
  { key: "expense", label: "Pengeluaran Operasional" },
];

export default function ReportsPage() {
  const [store] = useState<StoreSettings>(() =>
    loadJSON(STORE_KEY, defaultStore),
  );
  const [activeTab, setActiveTab] = useState<ReportType>("sales");
  const [startDate, setStartDate] = useState(firstOfMonthISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [month, setMonth] = useState(currentMonthValue());
  const [purchaseStatus, setPurchaseStatus] = useState<
    "" | PurchaseRow["status"]
  >("");

  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [employeeRows, setEmployeeRows] = useState<EmployeeRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary>({
    totalRevenue: 0,
    totalStockPurchases: 0,
    totalOperationalExpenses: 0,
    netProfit: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Penjualan, Stok, Pembelian, Pengeluaran — semua dikunci rentang tanggal yang sama.
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/reports/sales`, {
        params: { startDate, endDate },
      }),
      axios.get(`${API_BASE}/reports/profit`, {
        params: { startDate, endDate },
      }),
      axios.get(`${API_BASE}/reports/inventory`),
      axios.get(`${API_BASE}/reports/expenses`, {
        params: { startDate, endDate },
      }),
      axios.get(`${API_BASE}/reports/purchases`, {
        params: {
          startDate,
          endDate,
          ...(purchaseStatus ? { status: purchaseStatus } : {}),
        },
      }),
    ])
      .then(([salesRes, profitRes, inventoryRes, expenseRes, purchaseRes]) => {
        setSalesRows(salesRes.data.data);
        setProfitSummary(profitRes.data.data);
        setInventoryRows(inventoryRes.data.data);
        setExpenseRows(expenseRes.data.data);
        setPurchaseRows(purchaseRes.data.data);
        setErrorMsg(null);
      })
      .catch(() => setErrorMsg("Gagal memuat data laporan dari server"))
      .finally(() => setIsLoading(false));
  }, [startDate, endDate, purchaseStatus]);

  // Performa Karyawan + Absensi — digabung, dikunci filter "Bulan" yang sama.
  useEffect(() => {
    setIsLoadingEmployee(true);
    const { start, end } = monthRange(month);
    Promise.all([
      axios.get(`${API_BASE}/reports/employee-performance`, {
        params: { startDate: start, endDate: end },
      }),
      axios.get(`${API_BASE}/reports/attendance`, { params: { month } }),
    ])
      .then(([employeeRes, attendanceRes]) => {
        setEmployeeRows(employeeRes.data.data);
        setAttendanceRows(attendanceRes.data.data);
        setErrorMsg(null);
      })
      .catch(() =>
        setErrorMsg("Gagal memuat laporan karyawan & absensi dari server"),
      )
      .finally(() => setIsLoadingEmployee(false));
  }, [month]);

  const salesStats = useMemo(() => {
    const totalSales = salesRows.reduce((s, r) => s + r.total, 0);
    const totalTrx = salesRows.length;
    const avg = totalTrx > 0 ? Math.round(totalSales / totalTrx) : 0;
    return { totalSales, totalTrx, avg };
  }, [salesRows]);

  const inventoryStats = useMemo(() => {
    const totalSku = inventoryRows.length;
    const totalStockValue = inventoryRows.reduce(
      (s, r) => s + r.stock * r.costPrice,
      0,
    );
    const lowStock = inventoryRows.filter((r) => r.stock <= 10).length;
    return { totalSku, totalStockValue, lowStock };
  }, [inventoryRows]);

  const expenseStats = useMemo(() => {
    const totalExpense = expenseRows.reduce((s, r) => s + r.amount, 0);
    const totalEntries = expenseRows.length;
    const avg = totalEntries > 0 ? Math.round(totalExpense / totalEntries) : 0;
    return { totalExpense, totalEntries, avg };
  }, [expenseRows]);

  const purchaseStats = useMemo(() => {
    const purchaseIds = new Set(purchaseRows.map((r) => r.id));
    const totalPurchase = [...purchaseIds].reduce((total, id) => {
      const row = purchaseRows.find((purchase) => purchase.id === id);
      return total + (row?.totalAmount || 0);
    }, 0);
    const totalItems = purchaseRows.reduce(
      (total, row) => total + row.quantity,
      0,
    );
    const avg =
      purchaseIds.size > 0 ? Math.round(totalPurchase / purchaseIds.size) : 0;
    return { totalPurchase, totalOrders: purchaseIds.size, totalItems, avg };
  }, [purchaseRows]);

  // Gabungkan Performa Karyawan (per transaksi) dengan Absensi (per kehadiran),
  // dijoin berdasarkan nama. Absensi hanya mencakup role kasir (lihat
  // report.service.ts), jadi baris admin akan punya field absensi null ("-").
  const employeeAttendanceRows: EmployeeAttendanceRow[] = useMemo(() => {
    const attendanceByName = new Map(
      attendanceRows.map((a) => [a.employeeName, a]),
    );
    const names = new Set<string>([
      ...employeeRows.map((r) => r.name),
      ...attendanceRows.map((r) => r.employeeName),
    ]);
    return [...names]
      .map((name) => {
        const emp = employeeRows.find((r) => r.name === name);
        const att = attendanceByName.get(name);
        return {
          name,
          trxCount: emp?.trxCount || 0,
          totalSales: emp?.totalSales || 0,
          totalHadir: att ? att.totalHadir : null,
          totalTerlambat: att ? att.totalTerlambat : null,
          totalJamKerja: att ? att.totalJamKerja : null,
          lastAttendance: att ? att.lastAttendance : null,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [employeeRows, attendanceRows]);

  const employeeAttendanceStats = useMemo(() => {
    const totalTrx = employeeAttendanceRows.reduce(
      (s, r) => s + r.trxCount,
      0,
    );
    const totalHadir = employeeAttendanceRows.reduce(
      (s, r) => s + (r.totalHadir || 0),
      0,
    );
    const totalTerlambat = employeeAttendanceRows.reduce(
      (s, r) => s + (r.totalTerlambat || 0),
      0,
    );
    const top = employeeAttendanceRows[0];
    const rajin = [...employeeAttendanceRows].sort(
      (a, b) => (b.totalHadir || 0) - (a.totalHadir || 0),
    )[0];
    return { totalTrx, totalHadir, totalTerlambat, top, rajin };
  }, [employeeAttendanceRows]);

  // Satu tombol ekspor -> satu file .xlsx berisi SEMUA laporan (4 sheet:
  // Penjualan, Stok & Pembelian, Karyawan & Absensi, Pengeluaran), apa pun
  // tab yang lagi aktif di layar saat tombol ditekan.
  function handleExport() {
    exportAllReportsExcel({
      storeName: store.storeName,
      startDate,
      endDate,
      purchaseStatus,
      month,
      salesRows,
      profit: profitSummary,
      inventoryRows,
      purchaseRows,
      employeeAttendanceRows,
      expenseRows,
    });
  }

  return (
    <>
      <div className="page-head-row">
        <div className="page-head">
          <h1>Laporan</h1>
          <p>
            Analisis penjualan, stok, dan performa karyawan {store.storeName}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleExport}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            width={15}
            height={15}
          >
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Ekspor Semua Laporan
        </button>
      </div>

      {errorMsg && <p className="settings-msg error">{errorMsg}</p>}

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
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <label>Sampai</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="grid-3 mt-20">
            <div className="card kpi-card">
              <div className="kpi-label">Total Transaksi</div>
              <div className="kpi-value">{salesStats.totalTrx}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Total Penjualan</div>
              <div className="kpi-value">
                {formatRp(profitSummary.totalRevenue)}
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Laba Bersih</div>
              <div
                className={`kpi-value ${profitSummary.netProfit < 0 ? "kpi-negative" : "kpi-positive"}`}
              >
                {formatRp(profitSummary.netProfit)}
              </div>
            </div>
            <div className="card kpi-card">
            <div className="kpi-label">Rata-rata / Transaksi</div>
              <div className="kpi-value">{formatRp(salesStats.avg)}</div>
            </div>
          </div>

          <div className="card mt-20 profit-breakdown">
            <div className="card-title-row">
              <h3>Rincian Laba Bersih</h3>
              <span className="muted">
                Pendapatan - pembelian stok - operasional
              </span>
            </div>
            <div className="profit-breakdown-row">
              <span>Total Pendapatan</span>
              <strong>{formatRp(profitSummary.totalRevenue)}</strong>
            </div>
            <div className="profit-breakdown-row">
              <span>Pembelian Stok (diterima)</span>
              <strong className="kpi-negative">
                - {formatRp(profitSummary.totalStockPurchases)}
              </strong>
            </div>
            <div className="profit-breakdown-row">
              <span>Biaya Operasional</span>
              <strong className="kpi-negative">
                - {formatRp(profitSummary.totalOperationalExpenses)}
              </strong>
            </div>
            <div className="profit-breakdown-row total">
              <span>Laba Bersih</span>
              <strong
                className={
                  profitSummary.netProfit < 0 ? "kpi-negative" : "kpi-positive"
                }
              >
                {formatRp(profitSummary.netProfit)}
              </strong>
            </div>
          </div>

          <div className="card mt-20">
            <div className="card-title-row">
              <h3>Detail Transaksi</h3>
              <span className="muted">{salesRows.length} baris</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>No. Transaksi</th>
                  <th>Kasir</th>
                  <th>Jumlah Item</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      Memuat data...
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  salesRows.map((r) => (
                    <tr key={r.invoiceNumber}>
                      <td>{formatDateID(r.date)}</td>
                      <td>{r.invoiceNumber}</td>
                      <td>{r.cashierName}</td>
                      <td>{r.itemCount}</td>
                      <td>{formatRp(r.total)}</td>
                    </tr>
                  ))}
                {!isLoading && salesRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      Tidak ada transaksi di rentang tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "stockPurchase" && (
        <>
          <div className="card date-range-card mt-20">
            <label>Dari</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <label>Sampai</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <label>Status Pembelian</label>
            <select
              value={purchaseStatus}
              onChange={(e) =>
                setPurchaseStatus(e.target.value as "" | PurchaseRow["status"])
              }
            >
              <option value="">Semua status</option>
              <option value="pending">Pending</option>
              <option value="received">Diterima</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
          <p className="export-hint">
            Stok berupa kondisi terkini (real-time), sedangkan Pembelian
            mengikuti rentang tanggal & status di atas.
          </p>

          <div className="grid-3 mt-20">
            <div className="card kpi-card">
              <div className="kpi-label">Total SKU</div>
              <div className="kpi-value">{inventoryStats.totalSku}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Total Nilai Stok</div>
              <div className="kpi-value">
                {formatRp(inventoryStats.totalStockValue)}
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Produk Stok Rendah</div>
              <div className="kpi-value">{inventoryStats.lowStock}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Total PO</div>
              <div className="kpi-value">{purchaseStats.totalOrders}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Total Pembelian</div>
              <div className="kpi-value">
                {formatRp(purchaseStats.totalPurchase)}
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Rata-rata / PO</div>
              <div className="kpi-value">{formatRp(purchaseStats.avg)}</div>
            </div>
          </div>

          <div className="card mt-20">
            <div className="card-title-row">
              <h3>Nilai Stok per Produk</h3>
              <span className="muted">{inventoryRows.length} produk</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th>Stok</th>
                  <th>Harga Modal</th>
                  <th>Nilai Stok</th>
                </tr>
              </thead>
              <tbody>
                {inventoryRows.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.category || "-"}</td>
                    <td>
                      <span
                        className={`stock-pill${r.stock <= 10 ? " low" : ""}`}
                      >
                        {r.stock} pcs
                      </span>
                    </td>
                    <td>{formatRp(r.costPrice)}</td>
                    <td>{formatRp(r.stock * r.costPrice)}</td>
                  </tr>
                ))}
                {inventoryRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      Belum ada produk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card mt-20">
            <div className="card-title-row">
              <h3>Detail Pembelian</h3>
              <span className="muted">{purchaseRows.length} baris item</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>No. PO</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Produk</th>
                  <th>Jumlah</th>
                  <th>Harga Beli</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="empty-row">
                      Memuat data...
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  purchaseRows.map((r, index) => (
                    <tr key={`${r.id}-${index}`}>
                      <td>{formatDateID(r.date)}</td>
                      <td>{r.poNumber}</td>
                      <td>{r.supplierName || "-"}</td>
                      <td>
                        {r.status === "received"
                          ? "Diterima"
                          : r.status === "cancelled"
                            ? "Dibatalkan"
                            : "Pending"}
                      </td>
                      <td>{r.productName}</td>
                      <td>{r.quantity}</td>
                      <td>{formatRp(r.unitCost)}</td>
                      <td>{formatRp(r.subtotal)}</td>
                    </tr>
                  ))}
                {!isLoading && purchaseRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-row">
                      Tidak ada pembelian di filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "employeeAttendance" && (
        <>
          <div className="card date-range-card mt-20">
            <label>Bulan</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          <div className="grid-3 mt-20">
            <div className="card kpi-card">
              <div className="kpi-label">Total Transaksi</div>
              <div className="kpi-value">
                {employeeAttendanceStats.totalTrx}
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Karyawan Terbaik</div>
              <div className="kpi-value kpi-value-sm">
                {employeeAttendanceStats.top?.name || "-"}
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Total Kehadiran</div>
              <div className="kpi-value">
                {employeeAttendanceStats.totalHadir}
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Total Terlambat</div>
              <div className="kpi-value">
                {employeeAttendanceStats.totalTerlambat}
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Paling Rajin</div>
              <div className="kpi-value kpi-value-sm">
                {employeeAttendanceStats.rajin?.name || "-"}
              </div>
            </div>
          </div>

          <div className="card mt-20">
            <div className="card-title-row">
              <h3>Rekap Performa & Absensi per Karyawan</h3>
              <span className="muted">
                Kolom absensi "-" untuk admin — admin tidak wajib absen
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Jumlah Transaksi</th>
                  <th>Total Penjualan</th>
                  <th>Jumlah Hadir</th>
                  <th>Jumlah Terlambat</th>
                  <th>Total Jam Kerja</th>
                  <th>Absen Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingEmployee && (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      Memuat data...
                    </td>
                  </tr>
                )}
                {!isLoadingEmployee &&
                  employeeAttendanceRows.map((r) => (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td>{r.trxCount}</td>
                      <td>{formatRp(r.totalSales)}</td>
                      <td>{r.totalHadir === null ? "-" : r.totalHadir}</td>
                      <td>
                        {r.totalTerlambat === null ? (
                          "-"
                        ) : r.totalTerlambat > 0 ? (
                          <span className="stock-pill low">
                            {r.totalTerlambat}x
                          </span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td>
                        {r.totalJamKerja === null
                          ? "-"
                          : `${r.totalJamKerja} jam`}
                      </td>
                      <td>
                        {r.lastAttendance
                          ? formatDateID(r.lastAttendance)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                {!isLoadingEmployee && employeeAttendanceRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      Belum ada data karyawan di bulan ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "expense" && (
        <>
          <div className="card date-range-card mt-20">
            <label>Dari</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <label>Sampai</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="grid-3 mt-20">
            <div className="card kpi-card">
              <div className="kpi-label">Total Pengeluaran</div>
              <div className="kpi-value">
                {formatRp(expenseStats.totalExpense)}
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Jumlah Entri</div>
              <div className="kpi-value">{expenseStats.totalEntries}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Rata-rata / Entri</div>
              <div className="kpi-value">{formatRp(expenseStats.avg)}</div>
            </div>
          </div>

          <div className="card mt-20">
            <div className="card-title-row">
              <h3>Detail Pengeluaran Operasional</h3>
              <span className="muted">{expenseRows.length} baris</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th>Dicatat Oleh</th>
                  <th>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      Memuat data...
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  expenseRows.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDateID(r.date)}</td>
                      <td>{r.description}</td>
                      <td>{r.recordedBy}</td>
                      <td>{formatRp(r.amount)}</td>
                    </tr>
                  ))}
                {!isLoading && expenseRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      Tidak ada pengeluaran di rentang tanggal ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
