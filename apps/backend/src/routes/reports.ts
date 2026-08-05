import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getSalesReport,
  getInventoryReport,
  getEmployeePerformanceReport,
} from "../services/report.service";

export const reportsRouter = Router();
reportsRouter.use(authenticate);

// GET /api/reports/sales?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
reportsRouter.get("/sales", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const rows = getSalesReport(
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat laporan penjualan" });
  }
});

// GET /api/reports/inventory
reportsRouter.get("/inventory", (_req, res) => {
  try {
    const rows = getInventoryReport();
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat laporan stok" });
  }
});

// GET /api/reports/employee-performance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
reportsRouter.get("/employee-performance", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const rows = getEmployeePerformanceReport(
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat laporan performa karyawan" });
  }
});
