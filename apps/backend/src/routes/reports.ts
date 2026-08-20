import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth";
import {
  getSalesReport,
  getProfitReport,
  getInventoryReport,
  getEmployeePerformanceReport,
  getAttendanceReport,
  getExpenseReport,
  getPurchaseReport,
} from "../services/report.service";

export const reportsRouter = Router();
// Menu Laporan tidak ditampilkan untuk role kasir — dikunci admin only
// di level API juga, bukan cuma disembunyikan di sidebar.
reportsRouter.use(authenticate, adminOnly);

// GET /api/reports/sales?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
reportsRouter.get("/sales", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const rows = getSalesReport(
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined,
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Gagal memuat laporan penjualan",
    });
  }
});

// GET /api/reports/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
reportsRouter.get("/profit", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = getProfitReport(
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined,
    );
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Gagal memuat ringkasan laba bersih",
    });
  }
});

// GET /api/reports/inventory
reportsRouter.get("/inventory", (_req, res) => {
  try {
    const rows = getInventoryReport();
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Gagal memuat laporan stok",
    });
  }
});

// GET /api/reports/employee-performance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
reportsRouter.get("/employee-performance", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const rows = getEmployeePerformanceReport(
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined,
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Gagal memuat laporan performa karyawan",
    });
  }
});

// GET /api/reports/attendance?month=YYYY-MM
reportsRouter.get("/attendance", (req, res) => {
  try {
    const { month } = req.query;
    const rows = getAttendanceReport(month ? String(month) : undefined);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Gagal memuat laporan absensi",
    });
  }
});

// GET /api/reports/expenses?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
reportsRouter.get("/expenses", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const rows = getExpenseReport(
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined,
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Gagal memuat laporan pengeluaran operasional",
    });
  }
});

// GET /api/reports/purchases?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&status=pending
reportsRouter.get("/purchases", (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const purchaseStatus = status ? String(status) : undefined;
    if (
      purchaseStatus &&
      !["pending", "received", "cancelled"].includes(purchaseStatus)
    ) {
      res
        .status(400)
        .json({ success: false, message: "Status pembelian tidak valid" });
      return;
    }

    const rows = getPurchaseReport(
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined,
      purchaseStatus as "pending" | "received" | "cancelled" | undefined,
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || "Gagal memuat laporan pembelian",
    });
  }
});
