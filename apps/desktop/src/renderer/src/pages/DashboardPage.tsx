import { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { useAuth } from "../hooks/useAuth";
import { API_BASE } from "../lib/api";
import { StoreSettings, STORE_KEY, defaultStore, loadJSON } from "../lib/settings";
import "./DashboardPage.css";

interface DashboardSummary {
  mode: "month" | "day";
  periodLabel: string;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  revenueDeltaPercent: number | null;
  expenseDeltaPercent: number | null;
  profitDeltaPercent: number | null;
  monthlyTrend: { month: string; revenue: number; expense: number }[];
  costBreakdown: { label: string; value: number }[];
  recentPurchaseOrders: {
    poNumber: string;
    supplierName: string | null;
    date: string;
    status: string;
    amount: number;
  }[];
}

function todayInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const swatchColors = ["var(--rose-700)", "var(--rose-400)", "var(--amber-600)", "var(--blue-600)"];

const statusLabel: Record<string, { text: string; cls: string }> = {
  received: { text: "Diterima", cls: "status-paid" },
  pending: { text: "Menunggu", cls: "status-pending" },
  cancelled: { text: "Dibatalkan", cls: "status-overdue" },
};

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

function DeltaLabel({ percent, suffix = "dari bulan lalu" }: { percent: number | null; suffix?: string }) {
  if (percent === null) return <div className="kpi-delta">Data pembanding belum ada</div>;
  const up = percent >= 0;
  return (
    <div className={`kpi-delta ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(percent).toFixed(1)}% {suffix}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role !== "admin") return <KasirDashboard />;
  return <AdminDashboard />;
}

function AdminDashboard() {
  const [store] = useState<StoreSettings>(() => loadJSON(STORE_KEY, defaultStore));
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // dateFilter kosong = mode bulan berjalan (perilaku default/lama).
  // dateFilter terisi 'YYYY-MM-DD' = mode harian untuk tanggal tsb.
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    setIsLoading(true);
    axios
      .get(`${API_BASE}/dashboard/summary`, { params: dateFilter ? { date: dateFilter } : {} })
      .then((res) => {
        setData(res.data.data);
        setErrorMsg(null);
      })
      .catch(() => setErrorMsg("Gagal memuat ringkasan dashboard dari server"))
      .finally(() => setIsLoading(false));
  }, [dateFilter]);

  const trendTitle = data?.mode === "day" ? "Perbandingan Pendapatan Harian" : "Perbandingan Pendapatan Bulanan";
  const trendSubtitle = data?.mode === "day" ? "7 hari terakhir" : "6 bulan terakhir";
  const deltaSuffix = data?.mode === "day" ? "dari kemarin" : "dari bulan lalu";

  return (
    <>
      <div className="page-head">
        <h1>Laporan Keuangan</h1>
        <p>
          Ringkasan performa keuangan {store.storeName}
          {data ? ` — ${data.periodLabel}` : " bulan ini"}
        </p>
      </div>

      <div className="card date-filter-card mt-20">
        <label>Lihat data per tanggal</label>
        <input
          type="date"
          value={dateFilter}
          max={todayInputValue()}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <button
          type="button"
          className="btn-link-reset"
          onClick={() => setDateFilter(todayInputValue())}
        >
          Hari Ini
        </button>
        {dateFilter && (
          <button type="button" className="btn-link-reset" onClick={() => setDateFilter("")}>
            ✕ Reset ke Bulan Ini
          </button>
        )}
      </div>

      {errorMsg && <p className="settings-msg error">{errorMsg}</p>}
      {isLoading && <p className="muted">Memuat data...</p>}

      {data && (
        <>
          <div className="grid-3">
            <div className="card kpi-card">
              <div className="kpi-icon revenue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="kpi-label">Total Pendapatan</div>
              <div className="kpi-value">{formatRp(data.totalRevenue)}</div>
              <DeltaLabel percent={data.revenueDeltaPercent} suffix={deltaSuffix} />
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon expense">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M20 12H4M4 12l6-6M4 12l6 6" />
                </svg>
              </div>
              <div className="kpi-label">Total Pengeluaran</div>
              <div className="kpi-value">{formatRp(data.totalExpense)}</div>
              <DeltaLabel percent={data.expenseDeltaPercent} suffix={deltaSuffix} />
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon profit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 17l6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
              </div>
              <div className="kpi-label">Laba Bersih</div>
              <div className="kpi-value">{formatRp(data.netProfit)}</div>
              <DeltaLabel percent={data.profitDeltaPercent} suffix={deltaSuffix} />
            </div>
          </div>

          <div className="grid-2 mt-20">
            <div className="card">
              <div className="card-title-row">
                <h3>{trendTitle}</h3>
                <span className="muted">{trendSubtitle}</span>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthlyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="#F6EAEC" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10.5, fill: "#948C93" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10.5, fill: "#948C93" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v / 1000}k`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatRp(Number(value)), ""]}
                      contentStyle={{ borderRadius: 10, border: "1px solid #F0E1E5", fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Pendapatan"
                      stroke="#9C3B52"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      name="Pengeluaran"
                      stroke="#D98FA3"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-title-row">
                <h3>Rincian Biaya</h3>
                <span className="muted">{data.mode === "day" ? "Tanggal ini" : "Bulan ini"}</span>
              </div>
              {data.costBreakdown.map((item, i) => (
                <div className="cost-item" key={item.label}>
                  <div className="label">
                    <span className="swatch" style={{ background: swatchColors[i % swatchColors.length] }} />
                    {item.label}
                  </div>
                  <div className="val">{formatRp(item.value)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card mt-20">
            <div className="card-title-row">
              <h3>Pesanan Pembelian Terbaru</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. PO</th>
                  <th>Pemasok</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPurchaseOrders.map((po) => (
                  <tr key={po.poNumber}>
                    <td>{po.poNumber}</td>
                    <td>{po.supplierName || "-"}</td>
                    <td>{formatDateID(po.date)}</td>
                    <td>
                      <span className={`status-pill ${statusLabel[po.status]?.cls || "status-pending"}`}>
                        {statusLabel[po.status]?.text || po.status}
                      </span>
                    </td>
                    <td>{formatRp(po.amount)}</td>
                  </tr>
                ))}
                {data.recentPurchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-row">Belum ada pesanan pembelian.</td>
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

/* ============================================================================
   Dashboard Kasir — ringkas, fokus ke performa hari ini.
   ========================================================================== */

interface KasirDashboardSummary {
  todayRevenue: number;
  todayTransactionCount: number;
  averageTransaction: number;
  revenueDeltaPercent: number | null;
  dailyTrend: { day: string; date: string; revenue: number }[];
  topProductsToday: { name: string; quantity: number }[];
}

const rankMedal = ["🥇", "🥈", "🥉", "4"];

function KasirDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<KasirDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get(`${API_BASE}/dashboard/daily-summary`)
      .then((res) => {
        setData(res.data.data);
        setErrorMsg(null);
      })
      .catch(() => setErrorMsg("Gagal memuat ringkasan harian dari server"))
      .finally(() => setIsLoading(false));
  }, []);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 11 ? "Selamat pagi" : greetingHour < 15 ? "Selamat siang" : greetingHour < 18 ? "Selamat sore" : "Selamat malam";

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <div className="kasir-hero">
        <div className="kasir-hero-blob" />
        <div className="kasir-hero-content">
          <div className="kasir-hero-eyebrow">{todayLabel}</div>
          <h1>{greeting}, {user?.name?.split(" ")[0] || "Kasir"} 👋</h1>
          <p>Ini ringkasan performa toko hari ini. Semangat melayani pelanggan!</p>
        </div>
        <svg className="kasir-hero-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
          <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6" />
          <circle cx="9" cy="21" r="1" />
          <circle cx="18" cy="21" r="1" />
        </svg>
      </div>

      {errorMsg && <p className="settings-msg error mt-20">{errorMsg}</p>}
      {isLoading && <p className="muted mt-20">Memuat data...</p>}

      {data && (
        <>
          <div className="grid-3 mt-20">
            <div className="card kpi-card kasir-kpi">
              <div className="kpi-icon revenue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="kpi-label">Pendapatan Hari Ini</div>
              <div className="kpi-value">{formatRp(data.todayRevenue)}</div>
              <DeltaLabel percent={data.revenueDeltaPercent} suffix="dari kemarin" />
            </div>

            <div className="card kpi-card kasir-kpi">
              <div className="kpi-icon" style={{ background: "var(--blue-100)", color: "var(--blue-600)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6" />
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="18" cy="21" r="1" />
                </svg>
              </div>
              <div className="kpi-label">Transaksi Hari Ini</div>
              <div className="kpi-value">{data.todayTransactionCount}</div>
              <div className="kpi-delta">Total struk terbit hari ini</div>
            </div>

            <div className="card kpi-card kasir-kpi">
              <div className="kpi-icon profit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 17l6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
              </div>
              <div className="kpi-label">Rata-rata / Transaksi</div>
              <div className="kpi-value">{formatRp(Math.round(data.averageTransaction))}</div>
              <div className="kpi-delta">Nilai belanja rata-rata pelanggan</div>
            </div>
          </div>

          <div className="grid-2 mt-20">
            <div className="card">
              <div className="card-title-row">
                <h3>Pendapatan 7 Hari Terakhir</h3>
                <span className="muted">Harian</span>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dailyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="#F6EAEC" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10.5, fill: "#948C93" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10.5, fill: "#948C93" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v / 1000}k`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatRp(Number(value)), "Pendapatan"]}
                      labelFormatter={(_label, payload) => payload?.[0]?.payload?.date || ""}
                      contentStyle={{ borderRadius: 10, border: "1px solid #F0E1E5", fontSize: 12 }}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {data.dailyTrend.map((entry, i) => (
                        <Cell
                          key={entry.date}
                          fill={i === data.dailyTrend.length - 1 ? "#9C3B52" : "#EFC3CC"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-title-row">
                <h3>Produk Terlaris</h3>
                <span className="muted">Hari ini</span>
              </div>
              {data.topProductsToday.length === 0 && (
                <p className="muted" style={{ padding: "12px 0" }}>Belum ada penjualan produk hari ini.</p>
              )}
              {data.topProductsToday.map((item, i) => (
                <div className="top-product-item" key={item.name}>
                  <span className={`rank-badge rank-${i}`}>{rankMedal[i] || i + 1}</span>
                  <div className="top-product-name">{item.name}</div>
                  <div className="top-product-qty">{item.quantity} terjual</div>
                </div>
              ))}
            </div>
          </div>

          <div className="tip-banner mt-20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <div>
              <strong>Butuh laporan lengkap atau data bulanan?</strong>
              Hubungi admin toko — menu Laporan dan ringkasan finansial khusus dikelola oleh admin.
            </div>
          </div>
        </>
      )}
    </>
  );
}