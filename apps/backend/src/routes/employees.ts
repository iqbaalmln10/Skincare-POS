import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth";
import {
  listEmployees,
  createEmployee,
  toggleEmployeeActive,
  deleteEmployee,
  listRecentActivity,
  changeOwnPassword,
} from "../services/employee.service";

export const employeesRouter = Router();
employeesRouter.use(authenticate);

// Daftar karyawan bisa dilihat siapa saja yang login (admin & kasir) —
// hanya aksi tambah/nonaktifkan/hapus yang dibatasi admin di bawah.
employeesRouter.get("/", (_req, res) => {
  try {
    const employees = listEmployees();
    res.json({ success: true, data: employees });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat daftar karyawan" });
  }
});

employeesRouter.get("/activity-log", (_req, res) => {
  try {
    const logs = listRecentActivity(10);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat activity log" });
  }
});

// Ganti password akun sendiri — dipakai dari halaman Settings, siapa saja
// yang login (admin maupun kasir) boleh ganti password miliknya sendiri.
employeesRouter.patch("/me/password", (req, res) => {
  try {
    changeOwnPassword(req.user!.userId, req.body?.currentPassword, req.body?.newPassword);
    res.json({ success: true, message: "Kata sandi berhasil diubah" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Pembuatan akun karyawan baru dibatasi admin — kasir tidak boleh membuat akun.
employeesRouter.post("/", adminOnly, (req, res) => {
  try {
    const employee = createEmployee({
      name: req.body?.name,
      email: req.body?.email,
      phone: req.body?.phone,
      role: req.body?.role,
      password: req.body?.password,
    });
    res.status(201).json({ success: true, data: employee });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

employeesRouter.patch("/:id/status", adminOnly, (req, res) => {
  try {
    const employee = toggleEmployeeActive(Number(req.params.id), req.user!.userId);
    res.json({ success: true, data: employee });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

employeesRouter.delete("/:id", adminOnly, (req, res) => {
  try {
    deleteEmployee(Number(req.params.id), req.user!.userId);
    res.json({ success: true, message: "Karyawan berhasil dihapus" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
