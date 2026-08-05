import { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { API_BASE } from "../lib/api";
import "./DashboardPage.css";

interface DashboardSummary {
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

const swatchColors = ["var(--rose-700)", "var(--rose-400)", "var(--amber-600)", "var(--blue-600)"];

const statusLabel: Record<string, { text: string; cls: string }> = {
  received: { text: "Received", cls: "status-paid" },
  pending: { text: "Pending", cls: "status-pending" },
  cancelled: { text: "Cancelled", cls: "status-overdue" },
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

function DeltaLabel({ percent }: { percent: number | null }) {
  if (percent === null) return <div className="kpi-delta">Data bulan lalu belum ada</div>;
  const up = percent >= 0;
  return (
    <div className={`kpi-delta ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(percent).toFixed(1)}% dari bulan lalu
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get(`${API_BASE}/dashboard/summary`)
      .then((res) => {
        setData(res.data.data);
        setErrorMsg(null);
      })
      .catch(() => setErrorMsg("Gagal memuat ringkasan dashboard dari server"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Financial Reports</h1>
        <p>Ringkasan performa keuangan Downtown Branch bulan ini</p>
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
              <div className="kpi-label">Total Revenue</div>
              <div className="kpi-value">{formatRp(data.totalRevenue)}</div>
              <DeltaLabel percent={data.revenueDeltaPercent} />
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon expense">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M20 12H4M4 12l6-6M4 12l6 6" />
                </svg>
              </div>
              <div className="kpi-label">Total Expense</div>
              <div className="kpi-value">{formatRp(data.totalExpense)}</div>
              <DeltaLabel percent={data.expenseDeltaPercent} />
            </div>

            <div className="card kpi-card">
              <div className="kpi-icon profit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 17l6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
              </div>
              <div className="kpi-label">Net Profit</div>
              <div className="kpi-value">{formatRp(data.netProfit)}</div>
              <DeltaLabel percent={data.profitDeltaPercent} />
            </div>
          </div>

          <div className="grid-2 mt-20">
            <div className="card">
              <div className="card-title-row">
                <h3>Monthly Revenue Comparison</h3>
                <span className="muted">6 bulan terakhir</span>
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
                      name="Revenue"
                      stroke="#9C3B52"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      name="Expense"
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
                <h3>Cost Breakdown</h3>
                <span className="muted">Bulan ini</span>
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
              <h3>Recent Purchase Orders</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Amount</th>
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
                    <td colSpan={5} className="empty-row">Belum ada purchase order.</td>
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