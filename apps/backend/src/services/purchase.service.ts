import { db } from "../db/connection";

export type PurchaseOrderStatus = "pending" | "received" | "cancelled";

interface POItemInput {
  productId: number;
  quantity: number;
  unitCost: number;
}

export interface CreatePOInput {
  supplierId: number;
  userId: number;
  note?: string | null;
  items: POItemInput[];
}

export interface POItemDTO {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface PurchaseOrderDTO {
  id: number;
  poNumber: string;
  supplierId: number | null;
  supplierName: string | null;
  userId: number;
  totalAmount: number;
  status: PurchaseOrderStatus;
  note: string | null;
  createdAt: string;
  items: POItemDTO[];
}

function generatePoNumber(): string {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

  // Hitung berapa PO yang sudah dibuat hari ini untuk nomor urut 4 digit.
  const countToday = db
    .prepare("SELECT COUNT(*) as cnt FROM purchase_orders WHERE po_number LIKE ?")
    .get(`PO-${datePart}-%`) as { cnt: number };

  const seq = String(countToday.cnt + 1).padStart(4, "0");
  return `PO-${datePart}-${seq}`;
}

function mapOrderRow(row: any): PurchaseOrderDTO {
  const items = db
    .prepare(`
      SELECT poi.id, poi.product_id, p.name AS product_name,
             poi.quantity, poi.unit_cost, poi.subtotal
      FROM purchase_order_items poi
      JOIN products p ON p.id = poi.product_id
      WHERE poi.purchase_order_id = ?
    `)
    .all(row.id) as any[];

  return {
    id: row.id,
    poNumber: row.po_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    userId: row.user_id,
    totalAmount: row.total_amount,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      productName: i.product_name,
      quantity: i.quantity,
      unitCost: i.unit_cost,
      subtotal: i.subtotal,
    })),
  };
}

const BASE_SELECT = `
  SELECT po.*, s.name AS supplier_name
  FROM purchase_orders po
  LEFT JOIN suppliers s ON s.id = po.supplier_id
`;

export function listPurchaseOrders(filter?: { status?: PurchaseOrderStatus }): PurchaseOrderDTO[] {
  const where = filter?.status ? "WHERE po.status = ?" : "";
  const params = filter?.status ? [filter.status] : [];

  const rows = db
    .prepare(`${BASE_SELECT} ${where} ORDER BY po.created_at DESC`)
    .all(...params) as any[];

  return rows.map(mapOrderRow);
}

export function getPurchaseOrderById(id: number): PurchaseOrderDTO {
  const row = db.prepare(`${BASE_SELECT} WHERE po.id = ?`).get(id) as any;
  if (!row) throw new Error("Purchase order tidak ditemukan");
  return mapOrderRow(row);
}

/**
 * Buat PO baru. Status SELALU 'pending' — stok tidak berubah di sini.
 * Stok baru berubah saat status diubah ke 'received' lewat updatePurchaseOrderStatus.
 */
export function createPurchaseOrder(input: CreatePOInput): PurchaseOrderDTO {
  if (!input.items || input.items.length === 0) {
    throw new Error("Purchase order wajib punya minimal 1 item");
  }

  for (const item of input.items) {
    if (item.quantity <= 0) throw new Error("Jumlah setiap item harus lebih dari 0");
    if (item.unitCost < 0) throw new Error("Harga beli tidak boleh negatif");
  }

  const supplier = db.prepare("SELECT id FROM suppliers WHERE id = ?").get(input.supplierId);
  if (!supplier) throw new Error("Supplier tidak ditemukan");

  const poNumber = generatePoNumber();
  const totalAmount = input.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  const newId = db.transaction(() => {
    const poResult = db
      .prepare(`
        INSERT INTO purchase_orders (supplier_id, user_id, po_number, total_amount, status, note)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `)
      .run(input.supplierId, input.userId, poNumber, totalAmount, input.note?.trim() || null);

    const poId = Number(poResult.lastInsertRowid);

    const insertItem = db.prepare(`
      INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of input.items) {
      const product = db.prepare("SELECT id FROM products WHERE id = ?").get(item.productId);
      if (!product) throw new Error(`Produk dengan id ${item.productId} tidak ditemukan`);

      insertItem.run(poId, item.productId, item.quantity, item.unitCost, item.quantity * item.unitCost);
    }

    db.prepare(`
      INSERT INTO activity_logs (user_id, action, module, reference_id, description)
      VALUES (?, 'create', 'purchase_order', ?, ?)
    `).run(input.userId, poId, `Membuat PO ${poNumber}`);

    return poId;
  })();

  return getPurchaseOrderById(newId);
}

/**
 * Ubah status PO. Ini satu-satunya tempat status boleh diubah.
 * pending -> received : stok BERTAMBAH, cost_price produk di-update (last-cost)
 * pending -> cancelled: tidak ada efek stok
 * received / cancelled adalah status FINAL — tidak bisa diubah lagi.
 */
export function updatePurchaseOrderStatus(
  id: number,
  newStatus: "received" | "cancelled",
  userId: number
): PurchaseOrderDTO {
  const po = getPurchaseOrderById(id);

  if (po.status !== "pending") {
    throw new Error(
      `PO ini sudah berstatus "${po.status}" dan bersifat final — tidak bisa diubah lagi`
    );
  }

  db.transaction(() => {
    if (newStatus === "received") {
      for (const item of po.items) {
        const product = db
          .prepare("SELECT stock_qty FROM products WHERE id = ?")
          .get(item.productId) as { stock_qty: number };

        const stockBefore = product.stock_qty;
        const stockAfter = stockBefore + item.quantity;

        // Update stok + cost_price (metode last-cost: harga beli terakhir menang)
        db.prepare(`
          UPDATE products
          SET stock_qty = ?, cost_price = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(stockAfter, item.unitCost, item.productId);

        // Catat audit trail perubahan stok
        db.prepare(`
          INSERT INTO stock_movements
            (product_id, user_id, purchase_order_id, type, quantity_change, stock_before, stock_after, note)
          VALUES (?, ?, ?, 'purchase', ?, ?, ?, ?)
        `).run(
          item.productId,
          userId,
          id,
          item.quantity,
          stockBefore,
          stockAfter,
          `Restock dari PO ${po.poNumber}`
        );
      }
    }

    db.prepare("UPDATE purchase_orders SET status = ? WHERE id = ?").run(newStatus, id);

    db.prepare(`
      INSERT INTO activity_logs (user_id, action, module, reference_id, description)
      VALUES (?, 'update', 'purchase_order', ?, ?)
    `).run(userId, id, `Status PO ${po.poNumber} diubah ke ${newStatus}`);
  })();

  return getPurchaseOrderById(id);
}

// PO yang sudah 'received' TIDAK BOLEH dihapus — stok yang sudah masuk tidak
// ikut terkoreksi kalau PO-nya dihapus, dan akan jadi phantom stock tanpa jejak audit.
export function deletePurchaseOrder(id: number): void {
  const po = getPurchaseOrderById(id);

  if (po.status === "received") {
    throw new Error(
      "PO yang sudah berstatus 'received' tidak bisa dihapus karena stok sudah terlanjur masuk. Gunakan penyesuaian stok manual jika ada kesalahan."
    );
  }

  db.prepare("DELETE FROM purchase_orders WHERE id = ?").run(id);
}
