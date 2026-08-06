import { db } from "../db/connection";
import bcrypt from "bcrypt";

export type EmployeeRole = "admin" | "kasir";

export interface EmployeeDTO {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: EmployeeRole;
  isActive: boolean;
  onDuty: boolean;
  lastClockIn: string | null;
}

interface EmployeeRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: EmployeeRole;
  is_active: number;
  open_shift_id: number | null;
  last_clock_in: string | null;
}

// onDuty  : ada shift berstatus 'open' milik user ini.
// lastClockIn: waktu clock_in absensi terakhir (masuk maupun sudah pulang).
const BASE_SELECT = `
  SELECT
    u.id, u.name, u.email, u.phone, u.role, u.is_active,
    (SELECT s.id FROM shifts s WHERE s.user_id = u.id AND s.status = 'open' LIMIT 1) AS open_shift_id,
    (SELECT a.clock_in FROM attendance_logs a WHERE a.user_id = u.id ORDER BY a.clock_in DESC LIMIT 1) AS last_clock_in
  FROM users u
`;

function toDTO(row: EmployeeRow): EmployeeDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active === 1,
    onDuty: row.open_shift_id !== null,
    lastClockIn: row.last_clock_in,
  };
}

export function listEmployees(): EmployeeDTO[] {
  const rows = db.prepare(`${BASE_SELECT} ORDER BY u.name ASC`).all() as EmployeeRow[];
  return rows.map(toDTO);
}

export function getEmployeeById(id: number): EmployeeDTO {
  const row = db.prepare(`${BASE_SELECT} WHERE u.id = ?`).get(id) as EmployeeRow | undefined;
  if (!row) throw new Error("Karyawan tidak ditemukan");
  return toDTO(row);
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  phone?: string | null;
  role: EmployeeRole;
  password: string;
}

export function createEmployee(input: CreateEmployeeInput): EmployeeDTO {
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  const role = input.role;
  const password = input.password;

  if (!name) throw new Error("Nama karyawan wajib diisi");
  if (!email) throw new Error("Email wajib diisi");
  if (role !== "admin" && role !== "kasir") throw new Error("Peran hanya boleh 'admin' atau 'kasir'");
  if (!password || password.length < 6) throw new Error("Password minimal 6 karakter");

  const dupe = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (dupe) throw new Error("Email ini sudah dipakai karyawan lain");

  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare(`
      INSERT INTO users (name, email, password, phone, role, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `)
    .run(name, email, passwordHash, phone, role);

  return getEmployeeById(Number(result.lastInsertRowid));
}

// Menonaktifkan diri sendiri sengaja diblokir — supaya admin yang login tidak
// bisa mengunci akunnya sendiri tanpa ada admin lain yang aktif.
export function toggleEmployeeActive(id: number, actingUserId: number): EmployeeDTO {
  const existing = getEmployeeById(id);

  if (id === actingUserId && existing.isActive) {
    throw new Error("Anda tidak bisa menonaktifkan akun Anda sendiri");
  }

  db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(
    existing.isActive ? 0 : 1,
    id
  );

  return getEmployeeById(id);
}

// Karyawan yang sudah punya riwayat (transaksi/shift/PO/activity log) tidak boleh
// dihapus permanen — sama seperti aturan di product/customer — karena akan merusak
// integritas laporan lama (FK ke users). Nonaktifkan saja lewat toggleEmployeeActive.
export function deleteEmployee(id: number, actingUserId: number): void {
  if (id === actingUserId) {
    throw new Error("Anda tidak bisa menghapus akun Anda sendiri");
  }

  getEmployeeById(id);

  const hasHistory =
    db.prepare("SELECT 1 FROM transactions WHERE user_id = ? LIMIT 1").get(id) ||
    db.prepare("SELECT 1 FROM shifts WHERE user_id = ? LIMIT 1").get(id) ||
    db.prepare("SELECT 1 FROM purchase_orders WHERE user_id = ? LIMIT 1").get(id) ||
    db.prepare("SELECT 1 FROM activity_logs WHERE user_id = ? LIMIT 1").get(id);

  if (hasHistory) {
    throw new Error(
      "Karyawan ini sudah punya riwayat transaksi/shift — tidak bisa dihapus permanen. Nonaktifkan saja."
    );
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

export interface ActivityLogDTO {
  id: number;
  employeeName: string;
  action: string;
  time: string;
}

export function listRecentActivity(limit = 10): ActivityLogDTO[] {
  const rows = db
    .prepare(`
      SELECT al.id, u.name AS employee_name, al.description, al.action, al.created_at
      FROM activity_logs al
      JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT ?
    `)
    .all(limit) as any[];

  return rows.map((row) => ({
    id: row.id,
    employeeName: row.employee_name,
    action: row.description || row.action,
    time: row.created_at,
  }));
}
