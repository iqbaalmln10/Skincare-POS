import { db } from "../db/connection";
import { getLowestTier, getTierForPoints } from "./membership-tier.service";

interface CustomerRow {
  id: number;
  membership_tier_id: number | null;
  tier_name: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  total_points: number;
  is_active: number;
  last_visit: string | null;
}

export interface CustomerDTO {
  id: number;
  membershipTierId: number | null;
  membershipTierName: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  totalPoints: number;
  isActive: boolean;
  lastVisit: string | null;
}

// last_visit diambil dari transaksi penjualan terakhir customer ini.
//
// PENTING soal tier: kolom `membership_tier_id` yang tersimpan di tabel
// `customers` TIDAK dipakai lagi buat nentuin tier yang ditampilkan —
// sengaja diganti jadi correlated subquery yang menghitung tier LANGSUNG
// dari `total_points` saat ini (persis logika getTierForPoints() di
// membership-tier.service.ts), setiap kali data di-baca.
//
// Alasannya: kolom `membership_tier_id` cuma ke-update lewat kode aplikasi
// (creditCustomerPoints/checkout), jadi begitu ada perubahan poin lewat
// jalur lain (edit manual di DB, atau kode lain yang lupa sync kolom ini),
// tier yang ditampilkan jadi basi — persis bug yang dilaporkan: poin sudah
// 3000 tapi tier masih kebaca Gold. Dengan dihitung live dari total_points,
// bug sejenis ini TIDAK BISA terjadi lagi sama sekali, apa pun penyebab
// perubahan poinnya, karena tidak ada lagi "cache" kolom yang bisa basi.
const BASE_SELECT = `
  SELECT
    c.id, c.name, c.phone, c.email, c.total_points, c.is_active,
    (SELECT mt.id FROM membership_tiers mt WHERE mt.min_points <= c.total_points ORDER BY mt.min_points DESC LIMIT 1) AS membership_tier_id,
    (SELECT mt.name FROM membership_tiers mt WHERE mt.min_points <= c.total_points ORDER BY mt.min_points DESC LIMIT 1) AS tier_name,
    (SELECT MAX(t.created_at) FROM transactions t WHERE t.customer_id = c.id) AS last_visit
  FROM customers c
`;

function toDTO(row: CustomerRow): CustomerDTO {
  return {
    id: row.id,
    membershipTierId: row.membership_tier_id,
    membershipTierName: row.tier_name,
    name: row.name,
    phone: row.phone,
    email: row.email,
    totalPoints: row.total_points,
    isActive: row.is_active === 1,
    lastVisit: row.last_visit,
  };
}

export function listCustomers(filter?: {
  search?: string;
  tierId?: number;
  includeInactive?: boolean;
}): CustomerDTO[] {
  const clauses: string[] = [];
  const params: any[] = [];

  if (!filter?.includeInactive) {
    clauses.push("c.is_active = 1");
  }

  if (filter?.search) {
    clauses.push("(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`);
  }

  if (filter?.tierId) {
    clauses.push(
      "(SELECT mt.id FROM membership_tiers mt WHERE mt.min_points <= c.total_points ORDER BY mt.min_points DESC LIMIT 1) = ?"
    );
    params.push(filter.tierId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`${BASE_SELECT} ${where} ORDER BY c.name ASC`).all(...params) as CustomerRow[];

  return rows.map(toDTO);
}

export function getCustomerById(id: number): CustomerDTO {
  const row = db.prepare(`${BASE_SELECT} WHERE c.id = ?`).get(id) as CustomerRow | undefined;
  if (!row) throw new Error("Pelanggan tidak ditemukan");
  return toDTO(row);
}

export interface CustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
}

// Tier TIDAK bisa diisi manual di sini secara sengaja — customer baru selalu
// mulai dari tier terendah (0 poin). Tier naik otomatis lewat getTierForPoints()
// begitu modul Sales/loyalty jalan dan total_points berubah.
export function createCustomer(input: CustomerInput): CustomerDTO {
  const name = input.name?.trim();
  if (!name) throw new Error("Nama pelanggan wajib diisi");

  const phone = input.phone?.trim() || null;
  const email = input.email?.trim() || null;

  if (phone) {
    const dupePhone = db.prepare("SELECT id FROM customers WHERE phone = ?").get(phone);
    if (dupePhone) throw new Error("Nomor telepon ini sudah terdaftar");
  }
  if (email) {
    const dupeEmail = db.prepare("SELECT id FROM customers WHERE email = ?").get(email);
    if (dupeEmail) throw new Error("Email ini sudah terdaftar");
  }

  const lowestTier = getLowestTier();

  const result = db
    .prepare(`
      INSERT INTO customers (membership_tier_id, name, phone, email, total_points)
      VALUES (?, ?, ?, ?, 0)
    `)
    .run(lowestTier?.id ?? null, name, phone, email);

  return getCustomerById(Number(result.lastInsertRowid));
}

export function updateCustomer(
  id: number,
  input: Partial<CustomerInput>
): CustomerDTO {
  const existing = getCustomerById(id);

  const name = input.name?.trim() || existing.name;
  const phone = input.phone !== undefined ? input.phone?.trim() || null : existing.phone;
  const email = input.email !== undefined ? input.email?.trim() || null : existing.email;

  if (phone && phone !== existing.phone) {
    const dupePhone = db.prepare("SELECT id FROM customers WHERE phone = ? AND id != ?").get(phone, id);
    if (dupePhone) throw new Error("Nomor telepon ini sudah dipakai pelanggan lain");
  }
  if (email && email !== existing.email) {
    const dupeEmail = db.prepare("SELECT id FROM customers WHERE email = ? AND id != ?").get(email, id);
    if (dupeEmail) throw new Error("Email ini sudah dipakai pelanggan lain");
  }

  db.prepare(`
    UPDATE customers SET name = ?, phone = ?, email = ?, updated_at = datetime('now') WHERE id = ?
  `).run(name, phone, email, id);

  return getCustomerById(id);
}

export function toggleCustomerActive(id: number): CustomerDTO {
  const existing = getCustomerById(id);
  db.prepare("UPDATE customers SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(
    existing.isActive ? 0 : 1,
    id
  );
  return getCustomerById(id);
}

// Reset manual oleh admin — dipakai untuk kasus khusus (koreksi kesalahan
// input, penyelesaian komplain, dsb), BUKAN mekanisme reset otomatis
// berkala. Tetap dicatat di point_ledger sebagai entri 'redeem' senilai
// total poin yang dihapus, supaya ada jejak audit — bukan langsung UPDATE
// diam-diam yang menghilangkan histori.
export function resetCustomerPoints(id: number): CustomerDTO {
  const existing = getCustomerById(id);
  if (existing.totalPoints <= 0) return existing;

  const lowestTier = getLowestTier();

  db.transaction(() => {
    db.prepare(
      "INSERT INTO point_ledger (customer_id, type, points, note) VALUES (?, 'redeem', ?, ?)"
    ).run(id, existing.totalPoints, "Reset manual oleh admin");
    db.prepare(
      "UPDATE customers SET total_points = 0, membership_tier_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(lowestTier?.id ?? null, id);
  })();

  return getCustomerById(id);
}

// Sama seperti produk: kalau customer sudah punya riwayat transaksi/poin,
// hard delete akan merusak integritas laporan lama. Wajib nonaktifkan saja.
export function deleteCustomer(id: number): void {
  getCustomerById(id);

  const usedInTransaction = db
    .prepare("SELECT 1 FROM transactions WHERE customer_id = ? LIMIT 1")
    .get(id);
  const usedInPoints = db
    .prepare("SELECT 1 FROM point_ledger WHERE customer_id = ? LIMIT 1")
    .get(id);

  if (usedInTransaction || usedInPoints) {
    throw new Error(
      "Pelanggan ini sudah punya riwayat transaksi/poin — tidak bisa dihapus permanen. Nonaktifkan saja."
    );
  }

  db.prepare("DELETE FROM customers WHERE id = ?").run(id);
}
