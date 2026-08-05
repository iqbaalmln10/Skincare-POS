import { db } from "../db/connection";

export interface SalesReportRow {
  date: string;
  invoiceNumber: string;
  cashierName: string;
  itemCount: number;
  total: number;
}

export interface InventoryReportRow {
  name: string;
  category: string | null;
  stock: number;
  costPrice: number;
}

export interface EmployeePerformanceRow {
  name: string;
  trxCount: number;
  totalSales: number;
}

// Rentang tanggal inklusif di kedua ujung — endDate ditambah 1 hari
// supaya transaksi di tanggal akhir ikut kehitung.
function toRangeParams(startDate?: string, endDate?: string): { start: string; end: string } {
  const start = startDate ? `${startDate} 00:00:00` : "0000-01-01 00:00:00";
  const end = endDate ? `${endDate} 23:59:59` : "9999-12-31 23:59:59";
  return { start, end };
}

export function getSalesReport(startDate?: string, endDate?: string): SalesReportRow[] {
  const { start, end } = toRangeParams(startDate, endDate);

  const rows = db
    .prepare(`
      SELECT
        t.created_at AS date,
        t.invoice_number,
        u.name AS cashier_name,
        COALESCE((SELECT SUM(ti.quantity) FROM transaction_items ti WHERE ti.transaction_id = t.id), 0) AS item_count,
        t.total_amount AS total
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      WHERE t.status = 'completed' AND t.created_at BETWEEN ? AND ?
      ORDER BY t.created_at DESC
    `)
    .all(start, end) as any[];

  return rows.map((row) => ({
    date: row.date,
    invoiceNumber: row.invoice_number,
    cashierName: row.cashier_name,
    itemCount: row.item_count,
    total: row.total,
  }));
}

export function getInventoryReport(): InventoryReportRow[] {
  const rows = db
    .prepare(`
      SELECT p.name, c.name AS category, p.stock_qty, p.cost_price
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
      ORDER BY p.name ASC
    `)
    .all() as any[];

  return rows.map((row) => ({
    name: row.name,
    category: row.category,
    stock: row.stock_qty,
    costPrice: row.cost_price,
  }));
}

export function getEmployeePerformanceReport(
  startDate?: string,
  endDate?: string
): EmployeePerformanceRow[] {
  const { start, end } = toRangeParams(startDate, endDate);

  const rows = db
    .prepare(`
      SELECT
        u.name,
        COUNT(t.id) AS trx_count,
        COALESCE(SUM(t.total_amount), 0) AS total_sales
      FROM users u
      JOIN transactions t
        ON t.user_id = u.id AND t.status = 'completed' AND t.created_at BETWEEN ? AND ?
      GROUP BY u.id
      ORDER BY total_sales DESC
    `)
    .all(start, end) as any[];

  return rows.map((row) => ({
    name: row.name,
    trxCount: row.trx_count,
    totalSales: row.total_sales,
  }));
}
