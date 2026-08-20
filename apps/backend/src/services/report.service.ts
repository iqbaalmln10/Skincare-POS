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

export interface AttendanceReportRow {
  employeeId: number;
  employeeName: string;
  totalHadir: number;
  totalTerlambat: number;
  totalJamKerja: number;
  lastAttendance: string | null;
}

export interface ExpenseReportRow {
  id: number;
  date: string;
  description: string;
  recordedBy: string;
  amount: number;
}

export interface PurchaseReportRow {
  id: number;
  date: string;
  poNumber: string;
  supplierName: string | null;
  createdBy: string;
  status: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  totalAmount: number;
}

export interface ProfitReportSummary {
  totalRevenue: number;
  totalStockPurchases: number;
  totalOperationalExpenses: number;
  netProfit: number;
}

// Rentang tanggal inklusif di kedua ujung — endDate ditambah 1 hari
// supaya transaksi di tanggal akhir ikut kehitung.
function toRangeParams(
  startDate?: string,
  endDate?: string,
): { start: string; end: string } {
  const start = startDate ? `${startDate} 00:00:00` : "0000-01-01 00:00:00";
  const end = endDate ? `${endDate} 23:59:59` : "9999-12-31 23:59:59";
  return { start, end };
}

export function getSalesReport(
  startDate?: string,
  endDate?: string,
): SalesReportRow[] {
  const { start, end } = toRangeParams(startDate, endDate);

  const rows = db
    .prepare(
      `
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
    `,
    )
    .all(start, end) as any[];

  return rows.map((row) => ({
    date: row.date,
    invoiceNumber: row.invoice_number,
    cashierName: row.cashier_name,
    itemCount: row.item_count,
    total: row.total,
  }));
}

export function getProfitReport(
  startDate?: string,
  endDate?: string,
): ProfitReportSummary {
  const { start, end } = toRangeParams(startDate, endDate);
  const totalRevenue = (
    db
      .prepare(
        `
      SELECT COALESCE(SUM(total_amount), 0) AS total
      FROM transactions
      WHERE status = 'completed' AND created_at BETWEEN ? AND ?
    `,
      )
      .get(start, end) as { total: number }
  ).total;
  const totalStockPurchases = (
    db
      .prepare(
        `
      SELECT COALESCE(SUM(total_amount), 0) AS total
      FROM purchase_orders
      WHERE status = 'received' AND created_at BETWEEN ? AND ?
    `,
      )
      .get(start, end) as { total: number }
  ).total;
  const totalOperationalExpenses = (
    db
      .prepare(
        `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE created_at BETWEEN ? AND ?
    `,
      )
      .get(start, end) as { total: number }
  ).total;

  return {
    totalRevenue,
    totalStockPurchases,
    totalOperationalExpenses,
    netProfit: totalRevenue - totalStockPurchases - totalOperationalExpenses,
  };
}

export function getInventoryReport(): InventoryReportRow[] {
  const rows = db
    .prepare(
      `
      SELECT p.name, c.name AS category, p.stock_qty, p.cost_price
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
      ORDER BY p.name ASC
    `,
    )
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
  endDate?: string,
): EmployeePerformanceRow[] {
  const { start, end } = toRangeParams(startDate, endDate);

  const rows = db
    .prepare(
      `
      SELECT
        u.name,
        COUNT(t.id) AS trx_count,
        COALESCE(SUM(t.total_amount), 0) AS total_sales
      FROM users u
      JOIN transactions t
        ON t.user_id = u.id AND t.status = 'completed' AND t.created_at BETWEEN ? AND ?
      GROUP BY u.id
      ORDER BY total_sales DESC
    `,
    )
    .all(start, end) as any[];

  return rows.map((row) => ({
    name: row.name,
    trxCount: row.trx_count,
    totalSales: row.total_sales,
  }));
}

// Laporan absensi bulanan — hanya untuk karyawan berperan 'kasir', karena
// admin tidak wajib absen. Dipakai admin untuk mengecek kehadiran tim.
// month diharapkan format 'YYYY-MM'; kalau kosong/tidak valid, pakai bulan berjalan.
export function getAttendanceReport(month?: string): AttendanceReportRow[] {
  const targetMonth =
    month && /^\d{4}-\d{2}$/.test(month)
      ? month
      : new Date().toISOString().slice(0, 7);

  const rows = db
    .prepare(
      `
      SELECT
        u.id AS employee_id,
        u.name AS employee_name,
        COUNT(a.id) AS total_hadir,
        SUM(CASE WHEN a.id IS NOT NULL AND time(a.clock_in, 'localtime') > '07:00:00' THEN 1 ELSE 0 END) AS total_terlambat,
        COALESCE(SUM(
          CASE WHEN a.clock_out IS NOT NULL
          THEN (julianday(a.clock_out) - julianday(a.clock_in)) * 24
          ELSE 0 END
        ), 0) AS total_jam,
        MAX(a.clock_in) AS last_attendance
      FROM users u
      LEFT JOIN attendance_logs a
        ON a.user_id = u.id AND strftime('%Y-%m', a.clock_in, 'localtime') = ?
      WHERE u.role = 'kasir'
      GROUP BY u.id
      ORDER BY u.name ASC
    `,
    )
    .all(targetMonth) as any[];

  return rows.map((row) => ({
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    totalHadir: row.total_hadir,
    totalTerlambat: row.total_terlambat,
    totalJamKerja: Math.round(row.total_jam * 10) / 10,
    lastAttendance: row.last_attendance,
  }));
}

// Laporan pengeluaran operasional — sumbernya tabel `expenses` yang sama
// dipakai fitur "Pengeluaran" di sidebar (lihat expense.service.ts).
// Query di sini sengaja berdiri sendiri (bukan import listExpenses) supaya
// report.service.ts tetap konsisten hanya bergantung ke db, sama seperti
// fungsi laporan lain di file ini.
export function getExpenseReport(
  startDate?: string,
  endDate?: string,
): ExpenseReportRow[] {
  const { start, end } = toRangeParams(startDate, endDate);

  const rows = db
    .prepare(
      `
      SELECT e.id, e.created_at AS date, e.description, u.name AS recorded_by, e.amount
      FROM expenses e
      JOIN users u ON u.id = e.user_id
      WHERE e.created_at BETWEEN ? AND ?
      ORDER BY e.created_at DESC
    `,
    )
    .all(start, end) as any[];

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    description: row.description,
    recordedBy: row.recorded_by,
    amount: row.amount,
  }));
}

export function getPurchaseReport(
  startDate?: string,
  endDate?: string,
  status?: "pending" | "received" | "cancelled",
): PurchaseReportRow[] {
  const { start, end } = toRangeParams(startDate, endDate);
  const statusClause = status ? " AND po.status = ?" : "";
  const params = status ? [start, end, status] : [start, end];

  const rows = db
    .prepare(
      `
      SELECT
        po.id,
        po.created_at AS date,
        po.po_number,
        s.name AS supplier_name,
        u.name AS created_by,
        po.status,
        p.name AS product_name,
        poi.quantity,
        poi.unit_cost,
        poi.subtotal,
        po.total_amount
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      JOIN users u ON u.id = po.user_id
      JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      JOIN products p ON p.id = poi.product_id
      WHERE po.created_at BETWEEN ? AND ?${statusClause}
      ORDER BY po.created_at DESC, poi.id ASC
    `,
    )
    .all(...params) as any[];

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    poNumber: row.po_number,
    supplierName: row.supplier_name,
    createdBy: row.created_by,
    status: row.status,
    productName: row.product_name,
    quantity: row.quantity,
    unitCost: row.unit_cost,
    subtotal: row.subtotal,
    totalAmount: row.total_amount,
  }));
}
