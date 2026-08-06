import { db } from "../db/connection";

export interface DashboardSummaryDTO {
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

const MONTH_LABEL_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

// Format 'YYYY-MM' dari sebuah Date, dipakai untuk grouping per bulan.
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function revenueForMonth(key: string): number {
  const row = db
    .prepare(`
      SELECT COALESCE(SUM(total_amount), 0) AS total
      FROM transactions
      WHERE status = 'completed' AND strftime('%Y-%m', created_at) = ?
    `)
    .get(key) as { total: number };
  return row.total;
}

// Expense bulanan didefinisikan sebagai gabungan:
//  - Pembelian stok (purchase_orders yang sudah 'received')
//  - Beban operasional (tabel expenses)
// Ini satu-satunya data biaya yang tercatat di skema saat ini.
function expenseForMonth(key: string): { poTotal: number; opTotal: number } {
  const po = db
    .prepare(`
      SELECT COALESCE(SUM(total_amount), 0) AS total
      FROM purchase_orders
      WHERE status = 'received' AND strftime('%Y-%m', created_at) = ?
    `)
    .get(key) as { total: number };

  const op = db
    .prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE strftime('%Y-%m', created_at) = ?
    `)
    .get(key) as { total: number };

  return { poTotal: po.total, opTotal: op.total };
}

function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function getDashboardSummary(): DashboardSummaryDTO {
  const now = new Date();
  const currentKey = monthKey(now);

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = monthKey(lastMonthDate);

  const currentRevenue = revenueForMonth(currentKey);
  const lastRevenue = revenueForMonth(lastKey);

  const currentExpenseParts = expenseForMonth(currentKey);
  const lastExpenseParts = expenseForMonth(lastKey);
  const currentExpense = currentExpenseParts.poTotal + currentExpenseParts.opTotal;
  const lastExpense = lastExpenseParts.poTotal + lastExpenseParts.opTotal;

  const currentProfit = currentRevenue - currentExpense;
  const lastProfit = lastRevenue - lastExpense;

  // Tren 6 bulan terakhir (termasuk bulan berjalan), urut kronologis.
  const monthlyTrend: { month: string; revenue: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const rev = revenueForMonth(key);
    const exp = expenseForMonth(key);
    monthlyTrend.push({
      month: MONTH_LABEL_ID[d.getMonth()],
      revenue: rev,
      expense: exp.poTotal + exp.opTotal,
    });
  }

  const costBreakdown = [
    { label: "Pembelian Stok (PO)", value: currentExpenseParts.poTotal },
    { label: "Beban Operasional", value: currentExpenseParts.opTotal },
  ];

  const recentPurchaseOrders = db
    .prepare(`
      SELECT po.po_number, s.name AS supplier_name, po.created_at, po.status, po.total_amount
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      ORDER BY po.created_at DESC
      LIMIT 5
    `)
    .all() as any[];

  return {
    totalRevenue: currentRevenue,
    totalExpense: currentExpense,
    netProfit: currentProfit,
    revenueDeltaPercent: deltaPercent(currentRevenue, lastRevenue),
    expenseDeltaPercent: deltaPercent(currentExpense, lastExpense),
    profitDeltaPercent: deltaPercent(currentProfit, lastProfit),
    monthlyTrend,
    costBreakdown,
    recentPurchaseOrders: recentPurchaseOrders.map((row) => ({
      poNumber: row.po_number,
      supplierName: row.supplier_name,
      date: row.created_at,
      status: row.status,
      amount: row.total_amount,
    })),
  };
}
