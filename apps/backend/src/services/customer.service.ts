import { db } from "../db/connection";
import { getLowestTier } from "./membership-tier.service";

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
// Modul Sales belum dibangun, jadi kolom ini akan selalu NULL untuk sekarang —
// begitu Sales jalan dan mengisi tabel transactions, field ini otomatis terisi
// tanpa perlu ubah apa pun di sini.
const BASE_SELECT = `
  SELECT
    c.id, c.membership_tier_id, mt.name AS tier_name,
    c.name, c.phone, c.email, c.total_points, c.is_active,
    (SELECT MAX(t.created_at) FROM transactions t WHERE t.customer_id = c.id) AS last_visit
  FROM customers c
  LEFT JOIN membership_tiers mt ON mt.id = c.membership_tier_id
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
    clauses.push("c.membership_tier_id = ?");
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
