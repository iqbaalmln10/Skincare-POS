import { db } from "../db/connection";

export interface SupplierRow {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  is_active: number;
}

export interface SupplierDTO {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

function toDTO(row: SupplierRow): SupplierDTO {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    isActive: row.is_active === 1,
  };
}

export function listSuppliers(includeInactive = false): SupplierDTO[] {
  const rows = includeInactive
    ? (db.prepare("SELECT * FROM suppliers ORDER BY name ASC").all() as SupplierRow[])
    : (db
        .prepare("SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC")
        .all() as SupplierRow[]);

  return rows.map(toDTO);
}

export function getSupplierById(id: number): SupplierDTO {
  const row = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(id) as
    | SupplierRow
    | undefined;

  if (!row) {
    throw new Error("Supplier tidak ditemukan");
  }

  return toDTO(row);
}

export function createSupplier(input: {
  name: string;
  phone?: string | null;
  address?: string | null;
}): SupplierDTO {
  const name = input.name?.trim();
  if (!name) {
    throw new Error("Nama supplier wajib diisi");
  }

  const result = db
    .prepare("INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)")
    .run(name, input.phone?.trim() || null, input.address?.trim() || null);

  return getSupplierById(Number(result.lastInsertRowid));
}

export function updateSupplier(
  id: number,
  input: { name?: string; phone?: string | null; address?: string | null }
): SupplierDTO {
  const existing = getSupplierById(id);

  const name = input.name?.trim() || existing.name;
  const phone = input.phone !== undefined ? input.phone?.trim() || null : existing.phone;
  const address = input.address !== undefined ? input.address?.trim() || null : existing.address;

  db.prepare("UPDATE suppliers SET name = ?, phone = ?, address = ? WHERE id = ?").run(
    name,
    phone,
    address,
    id
  );

  return getSupplierById(id);
}

// Soft-delete: supplier dinonaktifkan, bukan dihapus permanen.
// Alasan: purchase_orders & products masih mereferensikan supplier_id ini
// sebagai riwayat historis (ON DELETE SET NULL akan merusak data lama kalau di-hard-delete).
export function toggleSupplierActive(id: number): SupplierDTO {
  const existing = getSupplierById(id);
  db.prepare("UPDATE suppliers SET is_active = ? WHERE id = ?").run(
    existing.isActive ? 0 : 1,
    id
  );
  return getSupplierById(id);
}
