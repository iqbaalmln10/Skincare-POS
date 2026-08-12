import { db } from "../db/connection";
import { getLoyaltySettings } from "./loyalty-settings.service";
import { getTierForPoints } from "./membership-tier.service";

interface CheckoutItemInput {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  subtotal: number;
}

interface CheckoutInput {
  customerId?: number | null;
  paymentMethod: "cash" | "qris" | "transfer";
  paidAmount: number;
  manualDiscountAmount: number;
  items: CheckoutItemInput[];
}

interface CheckoutResult {
  invoiceNumber: string;
  totalAmount: number;
  changeAmount: number;
}

function generateInvoiceNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${date}-${random}`;
}

export function createCheckoutTransaction(input: CheckoutInput, userId: number): CheckoutResult {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("Keranjang belanja kosong");
  }

  const subtotal = input.items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = Math.round(input.manualDiscountAmount + input.items.reduce((sum, item) => sum + item.discountAmount, 0));
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const changeAmount = Math.max(0, input.paidAmount - totalAmount);

  if (input.paymentMethod === "cash" && input.paidAmount < totalAmount) {
    throw new Error("Uang diterima kurang dari total tagihan");
  }

  const invoiceNumber = generateInvoiceNumber();
  const loyaltySettings = getLoyaltySettings();
  const pointsEarned = input.customerId ? Math.floor(totalAmount / loyaltySettings.pointsPerAmount) : 0;

  return db.transaction(() => {
    const txResult = db
      .prepare(`
        INSERT INTO transactions (
          user_id, customer_id, invoice_number, subtotal, discount_amount,
          points_redeemed, points_earned, total_amount, paid_amount, change_amount, payment_method, status
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'completed')
      `)
      .run(
        userId,
        input.customerId ?? null,
        invoiceNumber,
        subtotal,
        discountAmount,
        pointsEarned,
        totalAmount,
        input.paidAmount,
        changeAmount,
        input.paymentMethod
      );

    const transactionId = Number(txResult.lastInsertRowid);

    const insertItem = db.prepare(`
      INSERT INTO transaction_items (
        transaction_id, product_id, product_name, quantity, unit_price,
        discount_per_item, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of input.items) {
      const product = db.prepare("SELECT id, stock_qty FROM products WHERE id = ?").get(item.productId) as { id: number; stock_qty: number } | undefined;
      if (!product) throw new Error(`Produk dengan id ${item.productId} tidak ditemukan`);

      if (product.stock_qty < item.quantity) {
        throw new Error(`Stok produk ${item.productName} tidak mencukupi`);
      }

      const stockBefore = product.stock_qty;
      const stockAfter = stockBefore - item.quantity;
      const itemDiscount = Math.round(item.discountAmount);
      const itemSubtotal = Math.max(0, item.unitPrice * item.quantity - itemDiscount);

      insertItem.run(
        transactionId,
        item.productId,
        item.productName,
        item.quantity,
        item.unitPrice,
        itemDiscount,
        itemSubtotal
      );

      db.prepare("UPDATE products SET stock_qty = ?, updated_at = datetime('now') WHERE id = ?").run(stockAfter, item.productId);

      db.prepare(
        "INSERT INTO stock_movements (product_id, user_id, transaction_id, type, quantity_change, stock_before, stock_after, note) VALUES (?, ?, ?, 'sale', ?, ?, ?, ?)"
      ).run(item.productId, userId, transactionId, -item.quantity, stockBefore, stockAfter, `Penjualan ${invoiceNumber}`);
    }

    if (input.customerId) {
      const customer = db.prepare("SELECT id, total_points FROM customers WHERE id = ?").get(input.customerId) as { id: number; total_points: number } | undefined;
      if (!customer) {
        throw new Error("Pelanggan tidak ditemukan");
      }

      const newTotalPoints = customer.total_points + pointsEarned;
      const tier = getTierForPoints(newTotalPoints);

      db.prepare(
        "INSERT INTO point_ledger (customer_id, transaction_id, type, points, note) VALUES (?, ?, 'earn', ?, ?)"
      ).run(input.customerId, transactionId, pointsEarned, `Penjualan ${invoiceNumber}`);

      db.prepare(
        "UPDATE customers SET total_points = ?, membership_tier_id = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newTotalPoints, tier?.id ?? null, input.customerId);
    }

    return { invoiceNumber, totalAmount, changeAmount };
  })();
}
