import { Router } from "express";
import { handleRfidTap, loginWithPassword } from "../services/auth.service";
import { authenticate } from "../middleware/auth";

export const authRouter = Router();

/**
 * POST /api/auth/rfid
 * Body: { uid: string }
 * Dipanggil frontend setiap kali ada input dari RFID reader.
 * Response berbeda tergantung state shift user:
 *   - action: "login"  → ada token, shiftId
 *   - action: "logout" → token null, shift ditutup
 */
authRouter.post("/rfid", (req, res) => {
  const { uid } = req.body as { uid?: string };

  if (!uid || typeof uid !== "string" || uid.trim() === "") {
    res.status(400).json({ success: false, message: "UID kartu tidak valid" });
    return;
  }

  try {
    const result = handleRfidTap(uid.trim());
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Fallback login manual untuk admin atau saat reader RFID tidak tersedia.
 */
authRouter.post("/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ success: false, message: "Email dan password wajib diisi" });
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
 * Logout manual (bukan via RFID) — untuk edge case seperti force logout oleh admin.
 * Shift TIDAK otomatis ditutup via endpoint ini — harus tap RFID.
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