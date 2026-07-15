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
import "./DashboardPage.css";

// 🔶 DATA DUMMY — nanti diganti fetch ke backend (endpoint report belum ada)
const revenueData = [
  { month: "Mei", revenue: 28500, expense: 19200 },
  { month: "Jun", revenue: 31200, expense: 20100 },
  { month: "Jul", revenue: 29800, expense: 21800 },
  { month: "Agu", revenue: 35400, expense: 20400 },
  { month: "Sep", revenue: 38900, expense: 23100 },
  { month: "Okt", revenue: 42850, expense: 24900 },
];

const costBreakdown = [
  { label: "Inventory", value: 72410, color: "var(--rose-700)" },
  { label: "Staff Wages", value: 31200, color: "var(--rose-400)" },
  { label: "Marketing", value: 12540, color: "var(--amber-600)" },
  { label: "Rent & Utilities", value: 8750, color: "var(--blue-600)" },
];

const purchaseOrders = [
  {
    po: "APO-13541",
    supplier: "Aura Organic Labs",
    date: "20 Okt 2025",
    status: "paid",
    amount: 4250,
  },
  {
    po: "APO-13542",
    supplier: "Velvet Glow Co.",
    date: "19 Okt 2025",
    status: "pending",
    amount: 1890,
  },
  {
    po: "APO-13543",
    supplier: "Luxe Scents Int.",
    date: "18 Okt 2025",
    status: "paid",
    amount: 12400,
  },
  {
    po: "APO-13544",
    supplier: "Radiance Logistics",
    date: "18 Okt 2025",
    status: "overdue",
    amount: 850,
  },
];

const statusLabel: Record<string, { text: string; cls: string }> = {
  paid: { text: "Paid", cls: "status-paid" },
  pending: { text: "Pending", cls: "status-pending" },
  overdue: { text: "Overdue", cls: "status-overdue" },
};

function formatUSD(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

export default function DashboardPage() {
  return (
    <>
      <div className="page-head">
        <h1>Financial Reports</h1>
        <p>
          Ringkasan performa keuangan Downtown Branch bulan ini (data dummy)
        </p>
      </div>

      <div className="grid-3">
        <div className="card kpi-card">
          <div className="kpi-icon revenue">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="kpi-label">Total Revenue</div>
          <div className="kpi-value">$42,850.24</div>
          <div className="kpi-delta up">▲ 12.4% dari bulan lalu</div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon expense">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M20 12H4M4 12l6-6M4 12l6 6" />
            </svg>
          </div>
          <div className="kpi-label">Total Expense</div>
          <div className="kpi-value">$24,900.00</div>
          <div className="kpi-delta down">▼ 3.1% dari bulan lalu</div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-icon profit">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M14 7h7v7" />
            </svg>
          </div>
          <div className="kpi-label">Net Profit</div>
          <div className="kpi-value">$17,950.24</div>
          <div className="kpi-delta up">▲ 8.7% dari bulan lalu</div>
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
              <LineChart
                data={revenueData}
                margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
              >
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
                  tickFormatter={(v) => `$${v / 1000}k`}
                />
                <Tooltip
                  formatter={(value: any) => [
                    `$${Number(value).toLocaleString("en-US")}`,
                    "",
                  ]}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #F0E1E5",
                    fontSize: 12,
                  }}
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
          {costBreakdown.map((item) => (
            <div className="cost-item" key={item.label}>
              <div className="label">
                <span className="swatch" style={{ background: item.color }} />
                {item.label}
              </div>
              <div className="val">{formatUSD(item.value)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-20">
        <div className="card-title-row">
          <h3>Recent Purchase Orders</h3>
          <span className="muted">View All</span>
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
            {purchaseOrders.map((po) => (
              <tr key={po.po}>
                <td>{po.po}</td>
                <td>{po.supplier}</td>
                <td>{po.date}</td>
                <td>
                  <span className={`status-pill ${statusLabel[po.status].cls}`}>
                    {statusLabel[po.status].text}
                  </span>
                </td>
                <td>{formatUSD(po.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tip-banner">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        <div>
          <strong>Inventory Efficiency Tip</strong>
          Restocking secara lebih sering bisa mengurangi biaya produksi hingga
          6.7% berdasarkan tren pembelian bulan ini.
        </div>
      </div>
    </>
  );
}
