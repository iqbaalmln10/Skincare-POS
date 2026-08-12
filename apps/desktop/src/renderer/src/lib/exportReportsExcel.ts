// Ekspor seluruh menu Laporan (Penjualan, Stok & Pembelian, Karyawan & Absensi)
// ke satu file Excel (.xlsx) multi-sheet, dengan format rapi: header berwarna,
// format Rupiah, lebar kolom otomatis, dan baris ringkasan.
//
// Pakai "xlsx-js-style" (bukan "xlsx" biasa) karena butuh styling (bold, warna,
// border) yang tidak didukung SheetJS Community murni. Aman dipakai di renderer
// Electron dengan nodeIntegration:false karena package ini men-disable Node
// builtins (buffer/fs/stream) lewat field "browser" di package.json-nya.
import * as XLSX from "xlsx-js-style";

// ------------------------------------------------------------------
// Types (harus sinkron dengan bentuk data dari ReportsPage)
// ------------------------------------------------------------------
export interface SalesRow {
  date: string;
  invoiceNumber: string;
  cashierName: string;
  itemCount: number;
  total: number;
}
export interface DailyProfitRow {
  date: string;
  revenue: number;
  expense: number;
  netProfit: number;
}
export interface SalesSummary {
  totalRevenue: number;
  totalTrx: number;
  totalPembelian: number;
  totalOperasional: number;
  totalExpense: number;
  netProfit: number;
}
export interface StockValueRow {
  productId: number;
  name: string;
  category: string | null;
  stock: number;
  costPrice: number;
  stockValue: number;
}
export interface PurchaseRow {
  poNumber: string;
  supplierName: string | null;
  date: string;
  status: string;
  itemCount: number;
  totalAmount: number;
}
export interface InventorySummary {
  totalSku: number;
  totalStockValue: number;
  lowStockCount: number;
  totalPO: number;
  totalPembelianDiterima: number;
}
export interface EmployeeDetailRow {
  employeeId: number;
  employeeName: string;
  role: "admin" | "kasir";
  trxCount: number;
  totalSales: number;
  totalHadir: number;
  totalTerlambat: number;
  totalJamKerja: number;
  lastAttendance: string | null;
}

export interface ExportReportsInput {
  storeName: string;
  sales: {
    startDate: string;
    endDate: string;
    rows: SalesRow[];
    summary: SalesSummary;
    dailyBreakdown: DailyProfitRow[];
  };
  inventory: {
    startDate: string;
    endDate: string;
    stockRows: StockValueRow[];
    purchaseRows: PurchaseRow[];
    summary: InventorySummary;
  };
  employee: {
    month: string;
    rows: EmployeeDetailRow[];
  };
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

// Tulis judul + subjudul di baris paling atas sheet (merge sepanjang jumlah kolom).
function writeSheetHeader(rows: any[][], title: string, subtitle: string, colCount: number) {
  rows.push([{ v: title, t: "s", s: titleStyle }]);
  rows.push([{ v: subtitle, t: "s", s: subtitleStyle }]);
  rows.push([]);
  return { merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } }] };
}

function applyHeaderRow(rows: any[][], headers: string[]) {
  rows.push(headers.map((h) => textCell(h, headerStyle)));
}

// ------------------------------------------------------------------
// Sheet builders
// ------------------------------------------------------------------

function buildSalesSheet(input: ExportReportsInput["sales"]): XLSX.WorkSheet {
  const rows: any[][] = [];
  const { merges } = writeSheetHeader(
    rows,
    "Laporan Penjualan",
    `Periode: ${formatDateID(input.startDate)} — ${formatDateID(input.endDate)}`,
    5
  );

  // Ringkasan
  rows.push([textCell("Total Transaksi", totalRowStyle), numCell(input.summary.totalTrx, totalRowStyle)]);
  rows.push([textCell("Total Penjualan", totalRowStyle), moneyCell(input.summary.totalRevenue, totalRowStyle)]);
  rows.push([textCell("Total Pengeluaran (Pembelian)", totalRowStyle), moneyCell(input.summary.totalPembelian, totalRowStyle)]);
  rows.push([textCell("Total Pengeluaran (Operasional)", totalRowStyle), moneyCell(input.summary.totalOperasional, totalRowStyle)]);
  rows.push([
    textCell("Laba Bersih", { ...totalRowStyle, font: { ...totalRowStyle.font, color: { rgb: input.summary.netProfit >= 0 ? COLOR_GREEN : COLOR_RED } } }),
    moneyCell(input.summary.netProfit, { ...totalRowStyle, font: { ...totalRowStyle.font, color: { rgb: input.summary.netProfit >= 0 ? COLOR_GREEN : COLOR_RED } } }),
  ]);
  rows.push([]);

  // Laba bersih harian
  rows.push([textCell("Rekap Laba Bersih Harian", titleStyle)]);
  rows.push([]);
  applyHeaderRow(rows, ["Tanggal", "Pendapatan", "Pengeluaran", "Laba Bersih"]);
  const dailyHeaderRowIdx = rows.length - 1;
  for (const d of input.dailyBreakdown) {
    rows.push([
      textCell(formatDateID(d.date)),
      moneyCell(d.revenue),
      moneyCell(d.expense),
      moneyCell(d.netProfit, { ...cellStyle, font: { ...cellStyle.font, color: { rgb: d.netProfit >= 0 ? COLOR_GREEN : COLOR_RED } } }),
    ]);
  }
  if (input.dailyBreakdown.length === 0) rows.push([textCell("Tidak ada data di rentang ini.")]);
  rows.push([]);

  // Detail transaksi
  rows.push([textCell("Detail Transaksi", titleStyle)]);
  rows.push([]);
  applyHeaderRow(rows, ["Tanggal", "No. Transaksi", "Kasir", "Jumlah Item", "Total"]);
  const trxHeaderRowIdx = rows.length - 1;
  for (const r of input.rows) {
    rows.push([
      textCell(formatDateID(r.date)),
      textCell(r.invoiceNumber),
      textCell(r.cashierName),
      numCell(r.itemCount),
      moneyCell(r.total),
    ]);
  }
  if (input.rows.length === 0) rows.push([textCell("Tidak ada transaksi di rentang ini.")]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = [
    ...merges,
    { s: { r: dailyHeaderRowIdx - 2, c: 0 }, e: { r: dailyHeaderRowIdx - 2, c: 3 } },
    { s: { r: trxHeaderRowIdx - 2, c: 0 }, e: { r: trxHeaderRowIdx - 2, c: 4 } },
  ];
  ws["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 16 }];
  return ws;
}

function buildInventorySheet(input: ExportReportsInput["inventory"]): XLSX.WorkSheet {
  const rows: any[][] = [];
  const { merges } = writeSheetHeader(
    rows,
    "Laporan Stok & Pembelian Kulakan",
    `Riwayat pembelian periode: ${formatDateID(input.startDate)} — ${formatDateID(input.endDate)}`,
    6
  );

  rows.push([textCell("Total SKU Aktif", totalRowStyle), numCell(input.summary.totalSku, totalRowStyle)]);
  rows.push([textCell("Total Nilai Stok (HPP)", totalRowStyle), moneyCell(input.summary.totalStockValue, totalRowStyle)]);
  rows.push([textCell("Produk Stok Rendah", totalRowStyle), numCell(input.summary.lowStockCount, totalRowStyle)]);
  rows.push([textCell("Jumlah PO di Periode Ini", totalRowStyle), numCell(input.summary.totalPO, totalRowStyle)]);
  rows.push([textCell("Total Pengeluaran Pembelian (Diterima)", totalRowStyle), moneyCell(input.summary.totalPembelianDiterima, totalRowStyle)]);
  rows.push([]);

  rows.push([textCell("Nilai Stok per Produk", titleStyle)]);
  rows.push([]);
  applyHeaderRow(rows, ["Produk", "Kategori", "Stok", "Harga Modal (HPP)", "Nilai Stok"]);
  const stockHeaderRowIdx = rows.length - 1;
  for (const r of input.stockRows) {
    rows.push([
      textCell(r.name),
      textCell(r.category || "-"),
      numCell(r.stock),
      moneyCell(r.costPrice),
      moneyCell(r.stockValue),
    ]);
  }
  if (input.stockRows.length === 0) rows.push([textCell("Belum ada produk.")]);
  rows.push([]);

  rows.push([textCell("Riwayat Pembelian Kulakan (Purchase Order)", titleStyle)]);
  rows.push([]);
  applyHeaderRow(rows, ["No. PO", "Tanggal", "Supplier", "Status", "Jumlah Item", "Total"]);
  const poHeaderRowIdx = rows.length - 1;
  for (const r of input.purchaseRows) {
    rows.push([
      textCell(r.poNumber),
      textCell(formatDateID(r.date)),
      textCell(r.supplierName || "-"),
      textCell(r.status === "received" ? "Diterima" : r.status === "pending" ? "Pending" : "Dibatalkan"),
      numCell(r.itemCount),
      moneyCell(r.totalAmount),
    ]);
  }
  if (input.purchaseRows.length === 0) rows.push([textCell("Tidak ada pembelian di rentang ini.")]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = [
    ...merges,
    { s: { r: stockHeaderRowIdx - 2, c: 0 }, e: { r: stockHeaderRowIdx - 2, c: 4 } },
    { s: { r: poHeaderRowIdx - 2, c: 0 }, e: { r: poHeaderRowIdx - 2, c: 5 } },
  ];
  ws["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 13 }, { wch: 16 }];
  return ws;
}

function buildEmployeeSheet(input: ExportReportsInput["employee"]): XLSX.WorkSheet {
  const rows: any[][] = [];
  const { merges } = writeSheetHeader(
    rows,
    "Performa & Absensi Karyawan",
    `Bulan: ${input.month}`,
    8
  );

  applyHeaderRow(rows, [
    "Karyawan",
    "Role",
    "Jumlah Transaksi",
    "Total Penjualan",
    "Jumlah Hadir",
    "Jumlah Terlambat",
    "Total Jam Kerja",
    "Absen Terakhir",
  ]);
  for (const r of input.rows) {
    rows.push([
      textCell(r.employeeName),
      textCell(r.role === "admin" ? "Admin" : "Kasir"),
      numCell(r.trxCount),
      moneyCell(r.totalSales),
      textCell(r.role === "admin" ? "-" : r.totalHadir),
      textCell(r.role === "admin" ? "-" : r.totalTerlambat),
      textCell(r.role === "admin" ? "-" : `${r.totalJamKerja} jam`),
      textCell(r.lastAttendance ? formatDateID(r.lastAttendance) : "-"),
    ]);
  }
  if (input.rows.length === 0) rows.push([textCell("Belum ada data karyawan.")]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 16 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
  ];
  return ws;
}

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------
export function exportReportsToExcel(input: ExportReportsInput) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildSalesSheet(input.sales), "Penjualan");
  XLSX.utils.book_append_sheet(wb, buildInventorySheet(input.inventory), "Stok & Pembelian");
  XLSX.utils.book_append_sheet(wb, buildEmployeeSheet(input.employee), "Karyawan & Absensi");

  const wbout: ArrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${input.storeName.replace(/\s+/g, "-")}_Laporan_${stamp}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
