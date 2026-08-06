import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getDashboardSummary } from "../services/dashboard.service";

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

// GET /api/dashboard/summary
dashboardRouter.get("/summary", (_req, res) => {
  try {
    const summary = getDashboardSummary();
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat ringkasan dashboard" });
  }
});
