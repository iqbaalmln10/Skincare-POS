import { db } from "../db/connection";

export type PromotionType = "percent" | "fixed_amount";
export type PromotionScope = "all_products" | "specific_product";

export interface PromotionDTO {
  id: number;
  name: string;
  type: PromotionType;
  value: number;
  scope: PromotionScope;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  productIds: number[];
}

export interface PromotionInput {
  name: string;
  type: PromotionType;
  value: number;
  scope: PromotionScope;
  startDate: string;
  endDate: string;
  productIds?: number[];
}

function validateInput(input: PromotionInput) {
  if (!input.name?.trim()) throw new Error("Nama promo wajib diisi");
  if (!["percent", "fixed_amount"].includes(input.type)) {
    throw new Error("Tipe diskon tidak valid");
  }
  if (!input.value || input.value <= 0) {
    throw new Error("Nilai diskon harus lebih dari 0");
  }
  // Diskon persen di atas 100% tidak masuk akal secara bisnis — schema tidak
  // menegakkan batas atas ini (cuma value > 0), jadi divalidasi di sini.
  if (input.type === "percent" && input.value > 100) {
    throw new Error("Diskon persentase tidak boleh lebih dari 100%");
  }
  if (!input.startDate || !input.endDate) {
    throw new Error("Tanggal mulai dan berakhir wajib diisi");
  }
  if (input.endDate < input.startDate) {
    throw new Error("Tanggal berakhir tidak boleh sebelum tanggal mulai");
  }
  if (input.scope === "specific_product" && (!input.productIds || input.productIds.length === 0)) {
    throw new Error('Cakupan "Produk Tertentu" wajib pilih minimal 1 produk');
  }
}

function mapRow(row: any): PromotionDTO {
  const productIds = db
    .prepare("SELECT product_id FROM promotion_products WHERE promotion_id = ?")
    .all(row.id)
    .map((r: any) => r.product_id);

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    value: row.value,
    scope: row.scope,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active === 1,
    createdBy: row.created_by,
    createdAt: row.created_at,
    productIds,
  };
}

export function listPromotions(): PromotionDTO[] {
  const rows = db.prepare("SELECT * FROM promotions ORDER BY created_at DESC").all() as any[];
  return rows.map(mapRow);
}

export function getPromotionById(id: number): PromotionDTO {
  const row = db.prepare("SELECT * FROM promotions WHERE id = ?").get(id) as any;
  if (!row) throw new Error("Promo tidak ditemukan");
  return mapRow(row);
}

function syncPromotionProducts(promotionId: number, productIds: number[]) {
  db.prepare("DELETE FROM promotion_products WHERE promotion_id = ?").run(promotionId);

  const insert = db.prepare(
    "INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)"
  );
  for (const productId of productIds) {
    const product = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
    if (!product) throw new Error(`Produk dengan id ${productId} tidak ditemukan`);
    insert.run(promotionId, productId);
  }
}

export function createPromotion(input: PromotionInput, userId: number): PromotionDTO {
  validateInput(input);

  const newId = db.transaction(() => {
    const result = db
      .prepare(`
        INSERT INTO promotions (name, type, value, scope, start_date, end_date, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(input.name.trim(), input.type, input.value, input.scope, input.startDate, input.endDate, userId);

    const promoId = Number(result.lastInsertRowid);

    if (input.scope === "specific_product") {
      syncPromotionProducts(promoId, input.productIds!);
    }

    return promoId;
  })();

  return getPromotionById(newId);
}

export function updatePromotion(id: number, input: PromotionInput): PromotionDTO {
  getPromotionById(id); // pastikan ada
  validateInput(input);

  db.transaction(() => {
    db.prepare(`
      UPDATE promotions SET
        name = ?, type = ?, value = ?, scope = ?, start_date = ?, end_date = ?
      WHERE id = ?
    `).run(input.name.trim(), input.type, input.value, input.scope, input.startDate, input.endDate, id);

    // Scope bisa berubah dari specific_product -> all_products atau sebaliknya,
    // jadi pivot selalu di-sync ulang biar tidak ada data nyangkut.
    if (input.scope === "specific_product") {
      syncPromotionProducts(id, input.productIds!);
    } else {
      db.prepare("DELETE FROM promotion_products WHERE promotion_id = ?").run(id);
    }
  })();

  return getPromotionById(id);
}

export function togglePromotionActive(id: number): PromotionDTO {
  const existing = getPromotionById(id);
  db.prepare("UPDATE promotions SET is_active = ? WHERE id = ?").run(existing.isActive ? 0 : 1, id);
  return getPromotionById(id);
}

// Aman di-hard-delete: transactions.promotion_id pakai ON DELETE SET NULL,
// promotion_products pakai ON DELETE CASCADE — tidak ada riwayat yang rusak.
export function deletePromotion(id: number): void {
  getPromotionById(id);
  db.prepare("DELETE FROM promotions WHERE id = ?").run(id);
}
