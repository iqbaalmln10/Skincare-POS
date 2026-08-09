import { db } from "../db/connection";

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  code: string;
  isActive: boolean;
  productCount: number;
}

interface RawCategoryRow {
  id: number;
  name: string;
  slug: string;
  code: string;
  is_active: number;
  product_count: number;
}

const BASE_SELECT = `
  SELECT
    c.id, c.name, c.slug, c.code, c.is_active,
    (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
  FROM categories c
`;

function toDTO(row: RawCategoryRow): CategoryRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    code: row.code,
    isActive: row.is_active === 1,
    productCount: row.product_count,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Kode kategori dipakai sebagai prefix SKU (mis. "SER" -> "SER-0001").
// Selalu 3 huruf, uppercase, cuma dari karakter alfabet nama kategori.
function suggestCode(name: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  const base = (letters || "GEN").padEnd(3, "X").slice(0, 3);
  return base;
}

// Kalau kode hasil suggest/input sudah dipakai kategori lain, tempeli angka
// urut (SER, SER2, SER3, ...) supaya tetap unik tanpa gagal begitu saja —
// user tetap bisa override manual lewat field code di form kalau mau kode
// yang lebih rapi.
function ensureUniqueCode(candidate: string, excludeId?: number): string {
  let code = candidate.toUpperCase();
  let suffix = 1;
  while (true) {
    const clause = excludeId ? "code = ? AND id != ?" : "code = ?";
    const params = excludeId ? [code, excludeId] : [code];
    const dupe = db.prepare(`SELECT id FROM categories WHERE ${clause}`).get(...params);
    if (!dupe) return code;
    suffix += 1;
    code = `${candidate.toUpperCase()}${suffix}`;
  }
}

export function listCategories(includeInactive = false): CategoryRow[] {
  const where = includeInactive ? "" : "WHERE c.is_active = 1";
  const rows = db
    .prepare(`${BASE_SELECT} ${where} ORDER BY c.name ASC`)
    .all() as RawCategoryRow[];
  return rows.map(toDTO);
}

export function getCategoryById(id: number): CategoryRow {
  const row = db.prepare(`${BASE_SELECT} WHERE c.id = ?`).get(id) as RawCategoryRow | undefined;
  if (!row) throw new Error("Kategori tidak ditemukan");
  return toDTO(row);
}

export interface CategoryInput {
  name: string;
  code?: string | null;
}

export function createCategory(input: CategoryInput): CategoryRow {
  const name = input.name?.trim();
  if (!name) {
    throw new Error("Nama kategori wajib diisi");
  }

  const slug = slugify(name);
  const existingSlug = db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug);
  if (existingSlug) {
    throw new Error("Kategori dengan nama ini sudah ada");
  }

  const code = ensureUniqueCode(input.code?.trim() || suggestCode(name));

  const result = db
    .prepare("INSERT INTO categories (name, slug, code) VALUES (?, ?, ?)")
    .run(name, slug, code);

  return getCategoryById(Number(result.lastInsertRowid));
}

export function updateCategory(id: number, input: Partial<CategoryInput>): CategoryRow {
  const existing = getCategoryById(id);

  const name = input.name?.trim() || existing.name;
  const slug = input.name ? slugify(name) : existing.slug;

  if (input.name) {
    const dupeSlug = db
      .prepare("SELECT id FROM categories WHERE slug = ? AND id != ?")
      .get(slug, id);
    if (dupeSlug) throw new Error("Kategori dengan nama ini sudah ada");
  }

  const code = input.code && input.code.trim()
    ? ensureUniqueCode(input.code.trim(), id)
    : existing.code;

  db.prepare("UPDATE categories SET name = ?, slug = ?, code = ? WHERE id = ?").run(
    name,
    slug,
    code,
    id
  );

  return getCategoryById(id);
}

// Soft-delete: kategori dinonaktifkan, bukan dihapus permanen — produk lama
// yang masih mereferensikan category_id ini tetap valid (konsisten dengan
// pola suppliers/products, lihat toggleSupplierActive/toggleProductActive).
export function toggleCategoryActive(id: number): CategoryRow {
  const existing = getCategoryById(id);
  db.prepare("UPDATE categories SET is_active = ? WHERE id = ?").run(
    existing.isActive ? 0 : 1,
    id
  );
  return getCategoryById(id);
}

// Kategori hanya boleh dihapus permanen kalau belum punya produk sama sekali
// (beda dengan toggle-active yang selalu boleh) — supaya konsisten dengan
// aturan deleteProduct/deleteSupplier: data yang sudah direferensikan modul
// lain wajib di-nonaktifkan, bukan dihapus.
export function deleteCategory(id: number): void {
  const existing = getCategoryById(id);
  if (existing.productCount > 0) {
    throw new Error(
      "Kategori ini masih dipakai oleh produk — tidak bisa dihapus permanen. Nonaktifkan saja."
    );
  }
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
}

/**
 * Generate SKU otomatis berbasis kode kategori: "{CODE}-{urutan 4 digit}".
 * Urutan dihitung dari jumlah produk yang sudah pakai kode SKU tsb + 1,
 * pola yang sama dengan generatePoNumber() di purchase.service.ts.
 * categoryId null/undefined -> pakai kategori fallback "Umum" (kode GEN).
 * Dipakai oleh product.service.ts di Fase 2 (belum dipanggil di sini).
 */
export function generateSkuForCategory(categoryId?: number | null): string {
  let code: string;

  if (categoryId) {
    code = getCategoryById(categoryId).code;
  } else {
    const fallback = db.prepare("SELECT code FROM categories WHERE code = 'GEN'").get() as
      | { code: string }
      | undefined;
    code = fallback?.code ?? "GEN";
  }

  const count = db
    .prepare("SELECT COUNT(*) as cnt FROM products WHERE sku LIKE ?")
    .get(`${code}-%`) as { cnt: number };

  const seq = String(count.cnt + 1).padStart(4, "0");
  return `${code}-${seq}`;
}
