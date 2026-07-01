import { db } from "../db/connection";
import { signToken } from "../utils/jwt";
import bcrypt from "bcrypt";

interface TapResult {
  action: "login" | "logout";
  token: string | null;
  user: { id: number; name: string; role: string };
  shiftId: number | null;
}

/**
 * Dipanggil setiap kali reader RFID mengirim UID kartu.
 * Logic:
 *   - Cari kartu → cari user → cek shift aktif
 *   - Kalau tidak ada shift aktif → login (buka shift baru + catat clock_in)
 *   - Kalau sudah ada shift aktif milik user ini → logout (tutup shift + catat clock_out)
 */
export function handleRfidTap(uid: string): TapResult {
  // 1. Cari kartu RFID
  const card = db
    .prepare("SELECT * FROM rfid_cards WHERE uid_card = ? AND is_active = 1")
    .get(uid) as { id: number; user_id: number } | undefined;

  if (!card) {
    throw new Error("Kartu RFID tidak dikenali atau tidak aktif");
  }

  // 2. Ambil data user
  const user = db
    .prepare("SELECT id, name, role, is_active FROM users WHERE id = ?")
    .get(card.user_id) as { id: number; name: string; role: string; is_active: number } | undefined;

  if (!user || !user.is_active) {
    throw new Error("Karyawan tidak aktif");
  }

  // 3. Cek apakah user ini punya shift yang sedang open
  const openShift = db
    .prepare("SELECT * FROM shifts WHERE user_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1")
    .get(user.id) as { id: number } | undefined;

  if (!openShift) {
    // ── LOGIN: buka shift baru ──
    return db.transaction((): TapResult => {
      const now = new Date().toISOString();

      // Buat shift baru
      const shiftInsert = db
        .prepare(`
          INSERT INTO shifts (user_id, start_time, opening_cash, status, created_at)
          VALUES (?, ?, 0, 'open', ?)
        `)
        .run(user.id, now, now);

      const shiftId = Number(shiftInsert.lastInsertRowid);

      // Catat absensi masuk
      db.prepare(`
        INSERT INTO attendance_logs (user_id, shift_id, clock_in, created_at)
        VALUES (?, ?, ?, ?)
      `).run(user.id, shiftId, now, now);

      // Catat activity log
      db.prepare(`
        INSERT INTO activity_logs (user_id, action, module, reference_id, description, created_at)
        VALUES (?, 'create', 'shift', ?, ?, ?)
      `).run(user.id, shiftId, `${user.name} login via RFID`, now);

      const token = signToken({
        userId: user.id,
        role: user.role as "admin" | "kasir",
        shiftId,
      });

      return { action: "login", token, user, shiftId };
    })();
  } else {
    // ── LOGOUT: tutup shift aktif ──
    return db.transaction((): TapResult => {
      const now = new Date().toISOString();

      // Hitung expected_cash: opening_cash + total cash sales - total expenses
      const cashSales = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM transactions
        WHERE shift_id = ? AND payment_method = 'cash' AND status = 'completed'
      `).get(openShift.id) as { total: number };

      const totalExpenses = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE shift_id = ?
      `).get(openShift.id) as { total: number };

      const shift = db.prepare("SELECT opening_cash FROM shifts WHERE id = ?")
        .get(openShift.id) as { opening_cash: number };

      const expectedCash = shift.opening_cash + cashSales.total - totalExpenses.total;

      // Tutup shift
      db.prepare(`
        UPDATE shifts
        SET status = 'closed', end_time = ?, expected_cash = ?, updated_at = ?
        WHERE id = ?
      `).run(now, expectedCash, now, openShift.id);

      // Catat clock_out di attendance_logs
      db.prepare(`
        UPDATE attendance_logs
        SET clock_out = ?
        WHERE shift_id = ? AND user_id = ? AND clock_out IS NULL
      `).run(now, openShift.id, user.id);

      // Catat activity log
      db.prepare(`
        INSERT INTO activity_logs (user_id, action, module, reference_id, description, created_at)
        VALUES (?, 'update', 'shift', ?, ?, ?)
      `).run(user.id, openShift.id, `${user.name} logout via RFID`, now);

      return { action: "logout", token: null, user, shiftId: openShift.id };
    })();
  }
}

/**
 * Login manual via email + password (untuk admin dari PC yang tidak ada reader RFID,
 * atau sebagai fallback darurat). Tidak membuka shift otomatis.
 */
export function loginWithPassword(email: string, password: string) {
  const user = db
    .prepare("SELECT * FROM users WHERE email = ? AND is_active = 1")
    .get(email) as { id: number; name: string; role: string; password: string } | undefined;

  if (!user) {
    throw new Error("Email atau password salah");
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    throw new Error("Email atau password salah");
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