import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getAttendanceStatus, clockIn, clockOut } from "../services/attendance.service";

export const attendanceRouter = Router();
attendanceRouter.use(authenticate);

// GET /api/attendance/status
attendanceRouter.get("/status", (req, res) => {
  try {
    const status = getAttendanceStatus(req.user!.userId);
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/clock-in
attendanceRouter.post("/clock-in", (req, res) => {
  try {
    const result = clockIn(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/clock-out
attendanceRouter.post("/clock-out", (req, res) => {
  try {
    const result = clockOut(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
