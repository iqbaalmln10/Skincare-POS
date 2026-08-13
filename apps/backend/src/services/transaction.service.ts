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
  tierDiscountAmount: number;
  tierDiscountPercent: number;
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

  // PENTING soal makna field `item.subtotal`: dari kontrak yang sudah ada
  // (lihat SalesPage.tsx pemanggil endpoint ini), `item.subtotal` yang
  // dikirim sudah NET setelah dikurangi `item.discountAmount` (promo),
  // BUKAN subtotal kotor sebelum diskon. Salah asumsi soal ini gampang
  // bikin promo ke-kurangi DUA KALI (sekali karena sudah termasuk di
  // `item.subtotal`, sekali lagi kalau promoDiscount dikurangkan ulang).
  const postPromo = input.items.reduce((sum, item) => sum + item.subtotal, 0);
  const promoDiscount = Math.round(input.items.reduce((sum, item) => sum + item.discountAmount, 0));
  const grossSubtotal = postPromo + promoDiscount; // buat tampilan "Subtotal" di struk (sebelum diskon apa pun)

  // BUG LAMA: getTierForPoints sudah di-import tapi cuma dipakai buat
  // nge-set tier BARU setelah transaksi selesai (post-purchase), diskon
  // tier customer yang SEDANG AKTIF tidak pernah dipakai mengurangi total
  // transaksi ini — makanya customer yang sudah capai tier tertentu tidak
  // pernah ngerasain potongan tier-nya sama sekali. Diperbaiki di sini:
  // hitung tier dari total_points customer SAAT INI (sebelum poin dari
  // transaksi ini ditambahkan — poin dari transaksi ini sendiri tidak
  // boleh retroaktif menaikkan diskon transaksi yang sama), lalu terapkan
  // SEQUENTIAL setelah promo (bukan dijumlah/bukan ambil salah satu),
  // sesuai keputusan yang sudah disepakati sebelumnya.
  let tierDiscountPercent = 0;
  let customerCurrentPoints = 0;
  if (input.customerId) {
    const customer = db
      .prepare("SELECT total_points FROM customers WHERE id = ?")
      .get(input.customerId) as { total_points: number } | undefined;
    if (!customer) throw new Error("Pelanggan tidak ditemukan");
    customerCurrentPoints = customer.total_points;
    tierDiscountPercent = getTierForPoints(customerCurrentPoints)?.discountPercent ?? 0;
  }

  const tierDiscountAmount = Math.round((postPromo * tierDiscountPercent) / 100);
  const postTier = postPromo - tierDiscountAmount;
  const manualDiscount = Math.round(input.manualDiscountAmount);

  const discountAmount = promoDiscount + tierDiscountAmount + manualDiscount;
  const totalAmount = Math.max(0, postTier - manualDiscount);
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
        grossSubtotal,
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

    return { invoiceNumber, totalAmount, changeAmount, tierDiscountAmount, tierDiscountPercent };
  })();
}
