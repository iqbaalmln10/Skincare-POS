import { db } from "../db/connection";
import { signToken } from "../utils/jwt";
import bcrypt from "bcrypt";

/**
 * Login via email + password — satu-satunya cara masuk ke aplikasi
 * (fitur tap kartu RFID sudah dihapus). Tidak membuka shift otomatis;
 * shift dibuka/ditutup terpisah lewat tombol Absen Masuk/Pulang.
 */
export function loginWithPassword(email: string, password: string) {
  const user = db
    .prepare("SELECT * FROM users WHERE email = ? AND is_active = 1")
    .get(email) as { id: number; name: string; role: string; password: string } | undefined;

  if (!user) {
    throw new Error("Email atau kata sandi salah");
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    throw new Error("Email atau kata sandi salah");
  }

  // Cek shift aktif (kalau ada)
  const openShift = db
    .prepare("SELECT id FROM shifts WHERE user_id = ? AND status = 'open' LIMIT 1")
    .get(user.id) as { id: number } | undefined;

  const token = signToken({
    userId: user.id,
    role: user.role as "admin" | "kasir",
    shiftId: openShift?.id ?? null,
  });

  return { token, user: { id: user.id, name: user.name, role: user.role }, shiftId: openShift?.id ?? null };
}