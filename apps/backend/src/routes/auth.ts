import { Router } from "express";
import { loginWithPassword } from "../services/auth.service";
import { authenticate } from "../middleware/auth";

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Login utama aplikasi (admin & kasir) — dulu ada opsi tap RFID, sekarang
 * login manual jadi satu-satunya cara masuk ke aplikasi.
 */
authRouter.post("/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ success: false, message: "Email dan kata sandi wajib diisi" });
    return;
  }

  try {
    const result = loginWithPassword(email, password);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <token>
 * Logout dari aplikasi. Shift TIDAK otomatis ditutup di sini — karyawan tetap
 * harus absen pulang lewat tombol Absen Pulang (lihat /api/attendance/clock-out).
 */
authRouter.post("/logout", authenticate, (req, res) => {
  // Di arsitektur JWT in-memory, logout cukup dengan membuang token di sisi client.
  // Kalau butuh server-side invalidation nanti, tambahkan token blacklist di sini.
  res.json({ success: true, message: "Logout berhasil" });
});

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * Dipakai frontend saat app dibuka ulang untuk verifikasi token masih valid.
 */
authRouter.get("/me", authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});