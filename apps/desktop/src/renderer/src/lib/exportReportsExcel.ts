// Ekspor menu Laporan ke file Excel (.xlsx) yang rapi: header berwarna,
// format Rupiah, lebar kolom otomatis, dan baris ringkasan di atas tabel detail.
//
// Pakai "xlsx-js-style" (bukan "xlsx" biasa) karena butuh styling (bold, warna,
// border) yang tidak didukung SheetJS Community murni. Aman dipakai di renderer
// Electron dengan nodeIntegration:false karena package ini men-disable Node
// builtins (buffer/fs/stream) lewat field "browser" di package.json-nya.
import * as XLSX from "xlsx-js-style";

// ------------------------------------------------------------------
// Types — disamakan persis dengan bentuk data yang dipakai ReportsPage.tsx
// (lihat interface senama di sana). Didefinisikan ulang di sini supaya
// lib ini berdiri sendiri dan tidak bergantung import dari halaman.
// ------------------------------------------------------------------
export interface SalesRow {
  date: string;
  invoiceNumber: string;
  cashierName: string;
  itemCount: number;
  total: number;
}
export interface ProfitSummary {
  totalRevenue: number;
  totalStockPurchases: number;
  totalOperationalExpenses: number;
  netProfit: number;
}
export interface InventoryRow {
  name: string;
  category: string | null;
  stock: number;
  costPrice: number;
}
export interface PurchaseRow {
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
export interface EmployeeRow {
  name: string;
  trxCount: number;
  totalSales: number;
}
export interface AttendanceRow {
  employeeId: number;
  employeeName: string;
  totalHadir: number;
  totalTerlambat: number;
  totalJamKerja: number;
  lastAttendance: string | null;
}
export interface ExpenseRow {
  id: number;
  date: string;
  description: string;
  recordedBy: string;
  amount: number;
}

// Baris gabungan Performa Karyawan + Absensi, dijoin berdasarkan nama karyawan.
// Absensi hanya mencakup role kasir, jadi field absensi bisa null untuk admin
// (admin tidak wajib absen, lihat report.service.ts).
export interface EmployeeAttendanceRow {
  name: string;
  trxCount: number;
  totalSales: number;
  totalHadir: number | null;
  totalTerlambat: number | null;
  totalJamKerja: number | null;
  lastAttendance: string | null;
}

// ------------------------------------------------------------------
// Style tokens (disamakan dengan palet Lumière Skincare di tokens.css)
// ------------------------------------------------------------------
const COLOR_ROSE = "9C3B52";
const COLOR_ROSE_LIGHT = "FAE7EA";
const COLOR_INK = "2B2530";
const COLOR_WHITE = "FFFFFF";
const COLOR_GREEN = "2E9A63";
const COLOR_RED = "C9482E";

const RP_FMT = '"Rp"#,##0;[Red]-"Rp"#,##0';

const titleStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 14, color: { rgb: COLOR_INK } },
};
const subtitleStyle: XLSX.CellStyle = {
  font: { italic: true, sz: 10, color: { rgb: "6B6470" } },
};
const sectionTitleStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 11.5, color: { rgb: COLOR_ROSE } },
};
const headerStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 10.5, color: { rgb: COLOR_WHITE } },
  fill: { fgColor: { rgb: COLOR_ROSE }, patternType: "solid" },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: COLOR_ROSE } },
    bottom: { style: "thin", color: { rgb: COLOR_ROSE } },
    left: { style: "thin", color: { rgb: COLOR_ROSE } },
    right: { style: "thin", color: { rgb: COLOR_ROSE } },
  },
};
const cellStyle: XLSX.CellStyle = {
  font: { sz: 10.5, color: { rgb: COLOR_INK } },
  border: {
    bottom: { style: "hair", color: { rgb: "E5DEE1" } },
  },
};
const totalRowStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 10.5, color: { rgb: COLOR_INK } },
  fill: { fgColor: { rgb: COLOR_ROSE_LIGHT }, patternType: "solid" },
  border: {
    top: { style: "thin", color: { rgb: COLOR_ROSE } },
    bottom: { style: "thin", color: { rgb: COLOR_ROSE } },
  },
};

function moneyCell(value: number, style: XLSX.CellStyle = cellStyle) {
  return { v: value, t: "n" as const, z: RP_FMT, s: style };
}
function textCell(value: string | number, style: XLSX.CellStyle = cellStyle) {
  return { v: value, t: "s" as const, s: style };
}
function numCell(value: number, style: XLSX.CellStyle = cellStyle) {
  return { v: value, t: "n" as const, s: style };
}

function formatDateID(d: string) {
  try {
    return new Date(d.replace(" ", "T")).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function purchaseStatusLabel(status: string) {
  return status === "received"
    ? "Diterima"
    : status === "cancelled"
      ? "Dibatalkan"
      : "Pending";
}

// Tulis judul + subjudul di baris paling atas sheet (merge sepanjang jumlah kolom).
function writeSheetHeader(
  rows: any[][],
  title: string,
  subtitle: string,
  colCount: number,
) {
  rows.push([{ v: title, t: "s", s: titleStyle }]);
  rows.push([{ v: subtitle, t: "s", s: subtitleStyle }]);
  rows.push([]);
  return {
    merges: [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    ],
  };
}

function sectionTitleRow(rows: any[][], title: string) {
  rows.push([textCell(title, sectionTitleStyle)]);
  rows.push([]);
}

function applyHeaderRow(rows: any[][], headers: string[]) {
  rows.push(headers.map((h) => textCell(h, headerStyle)));
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  const wbout: ArrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilePart(s: string) {
  return s.trim().replace(/\s+/g, "-");
}

// ------------------------------------------------------------------
// 1) Laporan Penjualan
// ------------------------------------------------------------------
function buildSalesSheet(params: {
  storeName: string;
  startDate: string;
  endDate: string;
  rows: SalesRow[];
  profit: ProfitSummary;
}): XLSX.WorkSheet {
  const { storeName, startDate, endDate, rows, profit } = params;
  const sheetRows: any[][] = [];
  const { merges } = writeSheetHeader(
    sheetRows,
    "Laporan Penjualan",
    `${storeName} — Periode: ${formatDateID(startDate)} s/d ${formatDateID(endDate)}`,
    5,
  );

  sheetRows.push([textCell("Total Transaksi", totalRowStyle), numCell(rows.length, totalRowStyle)]);
  sheetRows.push([textCell("Total Pendapatan", totalRowStyle), moneyCell(profit.totalRevenue, totalRowStyle)]);
  sheetRows.push([textCell("Pembelian Stok (diterima)", totalRowStyle), moneyCell(profit.totalStockPurchases, totalRowStyle)]);
  sheetRows.push([textCell("Biaya Operasional", totalRowStyle), moneyCell(profit.totalOperationalExpenses, totalRowStyle)]);
  const netStyle = {
    ...totalRowStyle,
    font: { ...totalRowStyle.font, color: { rgb: profit.netProfit >= 0 ? COLOR_GREEN : COLOR_RED } },
  };
  sheetRows.push([textCell("Laba Bersih", netStyle), moneyCell(profit.netProfit, netStyle)]);
  sheetRows.push([]);

  sectionTitleRow(sheetRows, "Detail Transaksi");
  applyHeaderRow(sheetRows, ["Tanggal", "No. Transaksi", "Kasir", "Jumlah Item", "Total"]);
  const headerRowIdx = sheetRows.length - 1;
  for (const r of rows) {
    sheetRows.push([
      textCell(formatDateID(r.date)),
      textCell(r.invoiceNumber),
      textCell(r.cashierName),
      numCell(r.itemCount),
      moneyCell(r.total),
    ]);
  }
  if (rows.length === 0) sheetRows.push([textCell("Tidak ada transaksi di rentang tanggal ini.")]);

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws["!merges"] = [...merges, { s: { r: headerRowIdx - 2, c: 0 }, e: { r: headerRowIdx - 2, c: 4 } }];
  ws["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 16 }];
  return ws;
}

// ------------------------------------------------------------------
// 2) Laporan Stok & Pembelian (gabungan)
// ------------------------------------------------------------------
function buildStockPurchaseSheet(params: {
  storeName: string;
  startDate: string;
  endDate: string;
  purchaseStatus: string;
  inventoryRows: InventoryRow[];
  purchaseRows: PurchaseRow[];
}): XLSX.WorkSheet {
  const { storeName, startDate, endDate, purchaseStatus, inventoryRows, purchaseRows } = params;

  const totalSku = inventoryRows.length;
  const totalStockValue = inventoryRows.reduce((s, r) => s + r.stock * r.costPrice, 0);
  const lowStock = inventoryRows.filter((r) => r.stock <= 10).length;

  const purchaseIds = new Set(purchaseRows.map((r) => r.id));
  const totalPurchase = [...purchaseIds].reduce((total, id) => {
    const row = purchaseRows.find((p) => p.id === id);
    return total + (row?.totalAmount || 0);
  }, 0);
  const totalItems = purchaseRows.reduce((total, r) => total + r.quantity, 0);

  const sheetRows: any[][] = [];
  const { merges } = writeSheetHeader(
    sheetRows,
    "Laporan Stok & Pembelian",
    `${storeName} — Riwayat pembelian periode: ${formatDateID(startDate)} s/d ${formatDateID(endDate)}${purchaseStatus ? ` — Status: ${purchaseStatusLabel(purchaseStatus)}` : ""}`,
    8,
  );

  sheetRows.push([textCell("Total SKU Aktif", totalRowStyle), numCell(totalSku, totalRowStyle)]);
  sheetRows.push([textCell("Total Nilai Stok (HPP)", totalRowStyle), moneyCell(totalStockValue, totalRowStyle)]);
  sheetRows.push([textCell("Produk Stok Rendah (≤10)", totalRowStyle), numCell(lowStock, totalRowStyle)]);
  sheetRows.push([textCell("Jumlah PO di Periode Ini", totalRowStyle), numCell(purchaseIds.size, totalRowStyle)]);
  sheetRows.push([textCell("Total Nilai Pembelian", totalRowStyle), moneyCell(totalPurchase, totalRowStyle)]);
  sheetRows.push([textCell("Total Item Dibeli", totalRowStyle), numCell(totalItems, totalRowStyle)]);
  sheetRows.push([]);

  sectionTitleRow(sheetRows, "Nilai Stok per Produk");
  applyHeaderRow(sheetRows, ["Produk", "Kategori", "Stok", "Harga Modal (HPP)", "Nilai Stok"]);
  const stockHeaderRowIdx = sheetRows.length - 1;
  for (const r of inventoryRows) {
    sheetRows.push([
      textCell(r.name),
      textCell(r.category || "-"),
      numCell(r.stock),
      moneyCell(r.costPrice),
      moneyCell(r.stock * r.costPrice),
    ]);
  }
  if (inventoryRows.length === 0) sheetRows.push([textCell("Belum ada produk.")]);
  sheetRows.push([]);

  sectionTitleRow(sheetRows, "Detail Pembelian (Purchase Order)");
  applyHeaderRow(sheetRows, [
    "Tanggal",
    "No. PO",
    "Supplier",
    "Dibuat Oleh",
    "Status",
    "Produk",
    "Jumlah",
    "Harga Beli",
    "Subtotal",
    "Total PO",
  ]);
  const poHeaderRowIdx = sheetRows.length - 1;
  for (const r of purchaseRows) {
    sheetRows.push([
      textCell(formatDateID(r.date)),
      textCell(r.poNumber),
      textCell(r.supplierName || "-"),
      textCell(r.createdBy),
      textCell(purchaseStatusLabel(r.status)),
      textCell(r.productName),
      numCell(r.quantity),
      moneyCell(r.unitCost),
      moneyCell(r.subtotal),
      moneyCell(r.totalAmount),
    ]);
  }
  if (purchaseRows.length === 0) sheetRows.push([textCell("Tidak ada pembelian di filter ini.")]);

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws["!merges"] = [
    ...merges,
    { s: { r: stockHeaderRowIdx - 2, c: 0 }, e: { r: stockHeaderRowIdx - 2, c: 4 } },
    { s: { r: poHeaderRowIdx - 2, c: 0 }, e: { r: poHeaderRowIdx - 2, c: 9 } },
  ];
  ws["!cols"] = [
    { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
    { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
  ];
  return ws;
}

// ------------------------------------------------------------------
// 3) Performa Karyawan & Absensi (gabungan)
// ------------------------------------------------------------------
function buildEmployeeAttendanceSheet(params: {
  storeName: string;
  month: string;
  rows: EmployeeAttendanceRow[];
}): XLSX.WorkSheet {
  const { storeName, month, rows } = params;

  const totalTrx = rows.reduce((s, r) => s + r.trxCount, 0);
  const totalHadir = rows.reduce((s, r) => s + (r.totalHadir || 0), 0);
  const totalTerlambat = rows.reduce((s, r) => s + (r.totalTerlambat || 0), 0);
  const top = [...rows].sort((a, b) => b.totalSales - a.totalSales)[0];

  const sheetRows: any[][] = [];
  const { merges } = writeSheetHeader(
    sheetRows,
    "Laporan Performa Karyawan & Absensi",
    `${storeName} — Bulan: ${month}`,
    7,
  );

  sheetRows.push([textCell("Total Transaksi Semua Karyawan", totalRowStyle), numCell(totalTrx, totalRowStyle)]);
  sheetRows.push([textCell("Karyawan Terbaik (Penjualan)", totalRowStyle), textCell(top?.name || "-", totalRowStyle)]);
  sheetRows.push([textCell("Total Kehadiran", totalRowStyle), numCell(totalHadir, totalRowStyle)]);
  sheetRows.push([textCell("Total Terlambat", totalRowStyle), numCell(totalTerlambat, totalRowStyle)]);
  sheetRows.push([]);

  sectionTitleRow(sheetRows, "Rekap Performa & Absensi per Karyawan");
  applyHeaderRow(sheetRows, [
    "Karyawan",
    "Jumlah Transaksi",
    "Total Penjualan",
    "Jumlah Hadir",
    "Jumlah Terlambat",
    "Total Jam Kerja",
    "Absen Terakhir",
  ]);
  const headerRowIdx = sheetRows.length - 1;
  for (const r of rows) {
    sheetRows.push([
      textCell(r.name),
      numCell(r.trxCount),
      moneyCell(r.totalSales),
      textCell(r.totalHadir === null ? "-" : r.totalHadir),
      textCell(r.totalTerlambat === null ? "-" : r.totalTerlambat),
      textCell(r.totalJamKerja === null ? "-" : `${r.totalJamKerja} jam`),
      textCell(r.lastAttendance ? formatDateID(r.lastAttendance) : "-"),
    ]);
  }
  if (rows.length === 0) sheetRows.push([textCell("Belum ada data karyawan di bulan ini.")]);

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws["!merges"] = [...merges, { s: { r: headerRowIdx - 2, c: 0 }, e: { r: headerRowIdx - 2, c: 6 } }];
  ws["!cols"] = [
    { wch: 20 }, { wch: 15 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
  ];
  return ws;
}

// ------------------------------------------------------------------
// 4) Pengeluaran Operasional
// ------------------------------------------------------------------
function buildExpenseSheet(params: {
  storeName: string;
  startDate: string;
  endDate: string;
  rows: ExpenseRow[];
}): XLSX.WorkSheet {
  const { storeName, startDate, endDate, rows } = params;
  const totalExpense = rows.reduce((s, r) => s + r.amount, 0);
  const avg = rows.length > 0 ? Math.round(totalExpense / rows.length) : 0;

  const sheetRows: any[][] = [];
  const { merges } = writeSheetHeader(
    sheetRows,
    "Laporan Pengeluaran Operasional",
    `${storeName} — Periode: ${formatDateID(startDate)} s/d ${formatDateID(endDate)}`,
    4,
  );

  sheetRows.push([textCell("Total Pengeluaran", totalRowStyle), moneyCell(totalExpense, totalRowStyle)]);
  sheetRows.push([textCell("Jumlah Entri", totalRowStyle), numCell(rows.length, totalRowStyle)]);
  sheetRows.push([textCell("Rata-rata / Entri", totalRowStyle), moneyCell(avg, totalRowStyle)]);
  sheetRows.push([]);

  sectionTitleRow(sheetRows, "Detail Pengeluaran Operasional");
  applyHeaderRow(sheetRows, ["Tanggal", "Keterangan", "Dicatat Oleh", "Jumlah"]);
  const headerRowIdx = sheetRows.length - 1;
  for (const r of rows) {
    sheetRows.push([
      textCell(formatDateID(r.date)),
      textCell(r.description),
      textCell(r.recordedBy),
      moneyCell(r.amount),
    ]);
  }
  if (rows.length === 0) sheetRows.push([textCell("Tidak ada pengeluaran di rentang tanggal ini.")]);

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws["!merges"] = [...merges, { s: { r: headerRowIdx - 2, c: 0 }, e: { r: headerRowIdx - 2, c: 3 } }];
  ws["!cols"] = [{ wch: 16 }, { wch: 34 }, { wch: 20 }, { wch: 16 }];
  return ws;
}

// ------------------------------------------------------------------
// Entry point — satu tombol, satu file .xlsx berisi SEMUA laporan
// (Penjualan, Stok & Pembelian, Karyawan & Absensi, Pengeluaran Operasional)
// sebagai 4 sheet terpisah, apa pun tab yang sedang aktif di layar.
// ------------------------------------------------------------------
export function exportAllReportsExcel(params: {
  storeName: string;
  startDate: string;
  endDate: string;
  purchaseStatus: string;
  month: string;
  salesRows: SalesRow[];
  profit: ProfitSummary;
  inventoryRows: InventoryRow[];
  purchaseRows: PurchaseRow[];
  employeeAttendanceRows: EmployeeAttendanceRow[];
  expenseRows: ExpenseRow[];
}) {
  const {
    storeName,
    startDate,
    endDate,
    purchaseStatus,
    month,
    salesRows,
    profit,
    inventoryRows,
    purchaseRows,
    employeeAttendanceRows,
    expenseRows,
  } = params;

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    buildSalesSheet({ storeName, startDate, endDate, rows: salesRows, profit }),
    "Penjualan",
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildStockPurchaseSheet({
      storeName,
      startDate,
      endDate,
      purchaseStatus,
      inventoryRows,
      purchaseRows,
    }),
    "Stok & Pembelian",
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildEmployeeAttendanceSheet({ storeName, month, rows: employeeAttendanceRows }),
    "Karyawan & Absensi",
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildExpenseSheet({ storeName, startDate, endDate, rows: expenseRows }),
    "Pengeluaran",
  );

  downloadWorkbook(
    wb,
    `${sanitizeFilePart(storeName)}_Laporan-Lengkap_${startDate}_${endDate}.xlsx`,
  );
}
