import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth";
import { getDashboardSummary, getKasirDashboardSummary } from "../services/dashboard.service";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

// GET /api/dashboard/summary
// GET /api/dashboard/summary?date=YYYY-MM-DD
// Ringkasan finansial (laba, biaya, PO) — data sensitif, admin only.
// Tanpa ?date: ringkasan bulan berjalan (perilaku lama).
// Dengan ?date: ringkasan untuk tanggal tsb saja, dibanding hari sebelumnya.
// Kasir pakai /daily-summary di bawah.
dashboardRouter.get("/summary", adminOnly, (req, res) => {
  try {
    const { date } = req.query;
    const dateFilter =
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
    const summary = getDashboardSummary(dateFilter);
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
