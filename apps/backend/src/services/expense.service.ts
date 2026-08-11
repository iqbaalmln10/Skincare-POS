import { db } from "../db/connection";

export interface ExpenseDTO {
  id: number;
  userId: number;
  userName: string;
  shiftId: number | null;
  description: string;
  amount: number;
  createdAt: string;
}

export interface CreateExpenseInput {
  userId: number;
  description: string;
  amount: number;
}

// Rentang tanggal inklusif di kedua ujung, sama seperti report.service.ts —
// endDate ditambah sampai akhir hari supaya entri di tanggal akhir ikut kehitung.
function toRangeParams(startDate?: string, endDate?: string): { start: string; end: string } {
  const start = startDate ? `${startDate} 00:00:00` : "0000-01-01 00:00:00";
  const end = endDate ? `${endDate} 23:59:59` : "9999-12-31 23:59:59";
  return { start, end };
}

function mapRow(row: any): ExpenseDTO {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    shiftId: row.shift_id,
    description: row.description,
    amount: row.amount,
    createdAt: row.created_at,
  };
}

const BASE_SELECT = `
  SELECT e.id, e.user_id, u.name AS user_name, e.shift_id, e.description, e.amount, e.created_at
  FROM expenses e
  JOIN users u ON u.id = e.user_id
`;

export function listExpenses(startDate?: string, endDate?: string): ExpenseDTO[] {
  const { start, end } = toRangeParams(startDate, endDate);

  const rows = db
    .prepare(`${BASE_SELECT} WHERE e.created_at BETWEEN ? AND ? ORDER BY e.created_at DESC`)
    .all(start, end) as any[];

  return rows.map(mapRow);
}

function getOpenShiftId(userId: number): number | null {
  const row = db
    .prepare("SELECT id FROM shifts WHERE user_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1")
    .get(userId) as { id: number } | undefined;
  return row?.id ?? null;
}

// Kalau user yang mencatat kebetulan sedang dalam shift aktif (kasir yang
// sudah absen masuk), pengeluaran otomatis ditautkan ke shift itu supaya
// tetap ikut kehitung di rekonsiliasi kas saat tutup shift (lihat
// attendance.service.ts clockOut). Kalau tidak ada shift aktif (misal admin
// mencatat pengeluaran sewa bulanan), shift_id disimpan NULL — murni
// pengeluaran operasional toko.
export function createExpense(input: CreateExpenseInput): ExpenseDTO {
  const description = input.description?.trim();
  if (!description) throw new Error("Keterangan pengeluaran wajib diisi");
  if (!input.amount || input.amount <= 0) throw new Error("Nominal pengeluaran harus lebih dari 0");

  const shiftId = getOpenShiftId(input.userId);

  const newId = db.transaction((): number => {
    const insert = db
      .prepare(`
        INSERT INTO expenses (user_id, shift_id, description, amount)
        VALUES (?, ?, ?, ?)
      `)
      .run(input.userId, shiftId, description, input.amount);

    const expenseId = Number(insert.lastInsertRowid);

    db.prepare(`
      INSERT INTO activity_logs (user_id, action, module, reference_id, description)
      VALUES (?, 'create', 'expense', ?, ?)
    `).run(input.userId, expenseId, `Mencatat pengeluaran operasional: ${description}`);

    return expenseId;
  })();

  const row = db.prepare(`${BASE_SELECT} WHERE e.id = ?`).get(newId) as any;
  return mapRow(row);
}

export function deleteExpense(id: number, requestingUserId: number): void {
  const row = db.prepare("SELECT id, description FROM expenses WHERE id = ?").get(id) as
    | { id: number; description: string }
    | undefined;
  if (!row) throw new Error("Data pengeluaran tidak ditemukan");

  db.transaction(() => {
    db.prepare("DELETE FROM expenses WHERE id = ?").run(id);

    db.prepare(`
      INSERT INTO activity_logs (user_id, action, module, reference_id, description)
      VALUES (?, 'delete', 'expense', ?, ?)
    `).run(requestingUserId, id, `Menghapus catatan pengeluaran: ${row.description}`);
  })();
}
