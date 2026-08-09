import { db } from "../db/connection";
import { generateSkuForCategory } from "./category.service";

interface ProductRow {
  id: number;
  category_id: number | null;
  category_name: string | null;
  default_supplier_id: number | null;
  default_supplier_name: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  min_stock: number;
  image_path: string | null;
  is_active: number;
}

export interface ProductDTO {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  defaultSupplierId: number | null;
  defaultSupplierName: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  minStock: number;
  imagePath: string | null;
  isActive: boolean;
}

const BASE_SELECT = `
  SELECT
    p.id, p.category_id, c.name AS category_name,
    p.default_supplier_id, s.name AS default_supplier_name,
    p.name, p.sku, p.barcode, p.description,
    p.cost_price, p.selling_price, p.stock_qty, p.min_stock,
    p.image_path, p.is_active
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN suppliers  s ON s.id = p.default_supplier_id
`;

function toDTO(row: ProductRow): ProductDTO {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    defaultSupplierId: row.default_supplier_id,
    defaultSupplierName: row.default_supplier_name,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    description: row.description,
    costPrice: row.cost_price,
    sellingPrice: row.selling_price,
    stockQty: row.stock_qty,
    minStock: row.min_stock,
    imagePath: row.image_path,
    isActive: row.is_active === 1,
  };
}

/**
 * List produk dengan filter opsional.
 * supplierId: kalau diisi, hanya tampilkan produk yang default_supplier_id-nya
 * cocok ATAU produk yang belum punya supplier tetap (NULL) — dipakai saat
 * memilih item di form Purchase Order.
 */
export function listProducts(filter?: {
  search?: string;
  categoryId?: number;
  supplierId?: number;
  includeInactive?: boolean;
}): ProductDTO[] {
  const clauses: string[] = [];
  const params: any[] = [];

  if (!filter?.includeInactive) {
    clauses.push("p.is_active = 1");
  }

  if (filter?.search) {
    clauses.push("(p.name LIKE ? OR p.sku LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }

  if (filter?.categoryId) {
    clauses.push("p.category_id = ?");
    params.push(filter.categoryId);
  }

  if (filter?.supplierId) {
    clauses.push("(p.default_supplier_id = ? OR p.default_supplier_id IS NULL)");
    params.push(filter.supplierId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`${BASE_SELECT} ${where} ORDER BY p.name ASC`).all(...params) as ProductRow[];

  return rows.map(toDTO);
}

export function getProductById(id: number): ProductDTO {
  const row = db.prepare(`${BASE_SELECT} WHERE p.id = ?`).get(id) as ProductRow | undefined;
  if (!row) {
    throw new Error("Produk tidak ditemukan");
  }
  return toDTO(row);
}

export interface ProductInput {
  name: string;
  sku?: string;
  categoryId?: number | null;
  defaultSupplierId?: number | null;
  barcode?: string | null;
  description?: string | null;
  costPrice?: number;
  sellingPrice: number;
  stockQty?: number;
  minStock?: number;
  imagePath?: string | null;
}

export function createProduct(input: ProductInput): ProductDTO {
  const name = input.name?.trim();

  if (!name) throw new Error("Nama produk wajib diisi");
  if (input.sellingPrice === undefined || input.sellingPrice < 0) {
    throw new Error("Harga jual wajib diisi dan tidak boleh negatif");
  }

  // SKU dibuat otomatis dari kode kategori kalau tidak dikirim manual
  // (lihat generateSkuForCategory di category.service.ts) — sengaja
  // di-generate di backend, bukan cuma preview di frontend, supaya tidak
  // ada race condition dua produk dibuat bersamaan dapat SKU yang sama.
  const sku = input.sku?.trim() || generateSkuForCategory(input.categoryId ?? null);

  const dupeSku = db.prepare("SELECT id FROM products WHERE sku = ?").get(sku);
  if (dupeSku) {
    throw new Error(`SKU "${sku}" sudah dipakai produk lain`);
  }

  const barcode = input.barcode?.trim() || null;
  if (barcode) {
    const dupeBarcode = db.prepare("SELECT id FROM products WHERE barcode = ?").get(barcode);
    if (dupeBarcode) {
      throw new Error(`Barcode "${barcode}" sudah dipakai produk lain`);
    }
  }

  const result = db
    .prepare(`
      INSERT INTO products
        (category_id, default_supplier_id, name, sku, barcode, description,
         cost_price, selling_price, stock_qty, min_stock, image_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.categoryId ?? null,
      input.defaultSupplierId ?? null,
      name,
      sku,
      barcode,
      input.description?.trim() || null,
      input.costPrice ?? 0,
      input.sellingPrice,
      input.stockQty ?? 0,
      input.minStock ?? 5,
      input.imagePath ?? null
    );

  return getProductById(Number(result.lastInsertRowid));
}

export function updateProduct(id: number, input: Partial<ProductInput>): ProductDTO {
  const existing = getProductById(id);

  if (input.sku && input.sku.trim() !== existing.sku) {
    const dupe = db.prepare("SELECT id FROM products WHERE sku = ? AND id != ?").get(input.sku.trim(), id);
    if (dupe) throw new Error(`SKU "${input.sku}" sudah dipakai produk lain`);
  }

  const barcode = input.barcode !== undefined ? input.barcode?.trim() || null : existing.barcode;
  if (barcode && barcode !== existing.barcode) {
    const dupeBarcode = db
      .prepare("SELECT id FROM products WHERE barcode = ? AND id != ?")
      .get(barcode, id);
    if (dupeBarcode) throw new Error(`Barcode "${barcode}" sudah dipakai produk lain`);
  }

  db.prepare(`
    UPDATE products SET
      category_id = ?, default_supplier_id = ?, name = ?, sku = ?, barcode = ?,
      description = ?, selling_price = ?, min_stock = ?, image_path = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    input.categoryId !== undefined ? input.categoryId : existing.categoryId,
    input.defaultSupplierId !== undefined ? input.defaultSupplierId : existing.defaultSupplierId,
    input.name?.trim() || existing.name,
    input.sku?.trim() || existing.sku,
    barcode,
    input.description !== undefined ? input.description?.trim() || null : existing.description,
    input.sellingPrice ?? existing.sellingPrice,
    input.minStock ?? existing.minStock,
    input.imagePath !== undefined ? input.imagePath : existing.imagePath,
    id
  );

  return getProductById(id);
}

export function toggleProductActive(id: number): ProductDTO {
  const existing = getProductById(id);
  db.prepare("UPDATE products SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(
    existing.isActive ? 0 : 1,
    id
  );
  return getProductById(id);
}

// Produk hanya boleh dihapus permanen kalau belum pernah dipakai di transaksi
// atau purchase order manapun — kalau sudah pernah, wajib pakai toggle-active (soft delete)
// supaya riwayat transaksi lama tetap valid (FK products.id dipakai transaction_items, dst).
export function deleteProduct(id: number): void {
  getProductById(id); // memastikan produk ada, lempar error kalau tidak

  const usedInTransaction = db
    .prepare("SELECT 1 FROM transaction_items WHERE product_id = ? LIMIT 1")
    .get(id);
  const usedInPurchase = db
    .prepare("SELECT 1 FROM purchase_order_items WHERE product_id = ? LIMIT 1")
    .get(id);

  if (usedInTransaction || usedInPurchase) {
    throw new Error(
      "Produk ini sudah pernah dipakai di transaksi/purchase order — tidak bisa dihapus permanen. Nonaktifkan saja."
    );
  }

  db.prepare("DELETE FROM products WHERE id = ?").run(id);
}
