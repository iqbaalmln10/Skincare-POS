import { db } from "../db/connection";
import { signToken } from "../utils/jwt";

export interface AttendanceStatusDTO {
  onDuty: boolean;
  clockedInToday: boolean;
  clockedOutToday: boolean;
  shiftId: number | null;
}

export interface ClockResultDTO {
  token: string;
  shiftId: number | null;
}

interface UserRow {
  id: number;
  name: string;
  role: "admin" | "kasir";
  is_active: number;
}

function getActiveUser(userId: number): UserRow {
  const user = db
    .prepare("SELECT id, name, role, is_active FROM users WHERE id = ?")
    .get(userId) as UserRow | undefined;

  if (!user || !user.is_active) throw new Error("Akun tidak aktif");
  return user;
}

function getOpenShift(userId: number) {
  return db
    .prepare("SELECT id, opening_cash FROM shifts WHERE user_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1")
    .get(userId) as { id: number; opening_cash: number } | undefined;
}

// Log absensi hari ini (berdasarkan waktu lokal), dipakai untuk mencegah
// dobel absen masuk/pulang dalam hari yang sama.
function getTodayLog(userId: number) {
  return db
    .prepare(`
      SELECT id, shift_id, clock_in, clock_out
      FROM attendance_logs
      WHERE user_id = ? AND date(clock_in, 'localtime') = date('now', 'localtime')
      ORDER BY clock_in DESC
      LIMIT 1
    `)
    .get(userId) as { id: number; shift_id: number | null; clock_in: string; clock_out: string | null } | undefined;
}

export function getAttendanceStatus(userId: number): AttendanceStatusDTO {
  const openShift = getOpenShift(userId);
  const todayLog = getTodayLog(userId);

  return {
    onDuty: !!openShift,
    clockedInToday: !!todayLog,
    clockedOutToday: !!todayLog?.clock_out,
    shiftId: openShift?.id ?? null,
  };
}

// Absen masuk manual (tombol UI) — buka shift baru + catat clock_in.
// Alur ini terpisah dari login — user langsung dapat shift aktif tanpa perlu login ulang.
export function clockIn(userId: number): ClockResultDTO {
  const user = getActiveUser(userId);

  if (user.role === "admin") {
    throw new Error("Admin tidak perlu absen — fitur ini hanya untuk karyawan (kasir)");
  }

  if (getOpenShift(userId)) {
    throw new Error("Anda sudah absen masuk dan shift masih berjalan");
  }

  const todayLog = getTodayLog(userId);
  if (todayLog) {
    throw new Error(
      todayLog.clock_out ? "Anda sudah absen pulang hari ini" : "Anda sudah absen masuk hari ini"
    );
  }

  return db.transaction((): ClockResultDTO => {
    const now = new Date().toISOString();

    const shiftInsert = db
      .prepare(`
        INSERT INTO shifts (user_id, start_time, opening_cash, status, created_at)
        VALUES (?, ?, 0, 'open', ?)
      `)
      .run(userId, now, now);
    const shiftId = Number(shiftInsert.lastInsertRowid);

    db.prepare(`
      INSERT INTO attendance_logs (user_id, shift_id, clock_in, created_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, shiftId, now, now);

    db.prepare(`
      INSERT INTO activity_logs (user_id, action, module, reference_id, description, created_at)
      VALUES (?, 'create', 'attendance', ?, ?, ?)
    `).run(userId, shiftId, `${user.name} absen masuk`, now);

    const token = signToken({ userId: user.id, role: user.role, shiftId });
    return { token, shiftId };
  })();
}

// Absen pulang manual — tutup shift aktif, hitung expected_cash dari kas +
// penjualan - pengeluaran, dan catat clock_out.
export function clockOut(userId: number): ClockResultDTO {
  const user = getActiveUser(userId);

  if (user.role === "admin") {
    throw new Error("Admin tidak perlu absen — fitur ini hanya untuk karyawan (kasir)");
  }

  const openShift = getOpenShift(userId);

  if (!openShift) {
    throw new Error("Anda belum absen masuk");
  }

  return db.transaction((): ClockResultDTO => {
    const now = new Date().toISOString();

    const cashSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) AS total
      FROM transactions
      WHERE shift_id = ? AND payment_method = 'cash' AND status = 'completed'
    `).get(openShift.id) as { total: number };

    const totalExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE shift_id = ?
    `).get(openShift.id) as { total: number };

    const expectedCash = openShift.opening_cash + cashSales.total - totalExpenses.total;

    db.prepare(`
      UPDATE shifts SET status = 'closed', end_time = ?, expected_cash = ? WHERE id = ?
    `).run(now, expectedCash, openShift.id);

    db.prepare(`
      UPDATE attendance_logs SET clock_out = ? WHERE shift_id = ? AND user_id = ? AND clock_out IS NULL
    `).run(now, openShift.id, userId);

    db.prepare(`
      INSERT INTO activity_logs (user_id, action, module, reference_id, description, created_at)
      VALUES (?, 'update', 'attendance', ?, ?, ?)
    `).run(userId, openShift.id, `${user.name} absen pulang`, now);

    const token = signToken({ userId: user.id, role: user.role, shiftId: null });
    return { token, shiftId: null };
  })();
}
