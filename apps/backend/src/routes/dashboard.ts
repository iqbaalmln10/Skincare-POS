import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth";
import { getDashboardSummary, getKasirDashboardSummary } from "../services/dashboard.service";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

// GET /api/dashboard/summary
// Ringkasan finansial bulanan (laba, biaya, PO) — data sensitif, admin only.
// Kasir pakai /daily-summary di bawah.
dashboardRouter.get("/summary", adminOnly, (_req, res) => {
  try {
    const summary = getDashboardSummary();
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat ringkasan dashboard" });
  }
});

// GET /api/dashboard/daily-summary
// Ringkasan harian ringkas (dipakai dashboard role kasir): pendapatan hari
// ini, jumlah transaksi, rata-rata, tren 7 hari, produk terlaris hari ini.
dashboardRouter.get("/daily-summary", (_req, res) => {
  try {
    const summary = getKasirDashboardSummary();
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat ringkasan harian" });
  }
});
