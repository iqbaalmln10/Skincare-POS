import { useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/logo.png";
import {
  StoreSettings,
  ReceiptSettings,
  STORE_KEY,
  RECEIPT_KEY,
  defaultStore,
  defaultReceipt,
  loadJSON,
} from "../lib/settings";
import "./SalesPage.css";

interface POSProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface CartItem extends POSProduct {
  qty: number;
}

interface ReceiptData {
  transactionId: string;
  timestamp: string;
  cashierName: string;
  customer: string;
  paymentMethod: "cash" | "qris" | "card";
  items: CartItem[];
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  total: number;
  change: number;
}

// 🔶 DATA DUMMY — state lokal saja, belum nyambung ke backend/database
const POS_PRODUCTS: POSProduct[] = [
  { id: 1, name: "Radiance Rose Serum", category: "Serum", price: 89000, stock: 42 },
  { id: 2, name: "Deep Sea Hydra Cream", category: "Moisturizer", price: 129000, stock: 8 },
  { id: 3, name: "Detox Charcoal Mask", category: "Mask", price: 75000, stock: 27 },
  { id: 4, name: "Hydro Marine Cleanser", category: "Cleanser", price: 59000, stock: 4 },
  { id: 5, name: "Botanical Oil Cleanser", category: "Cleanser", price: 68000, stock: 60 },
  { id: 6, name: "Velvet Glow Toner", category: "Toner", price: 55000, stock: 33 },
  { id: 7, name: "Aqua Shield Sunscreen SPF50", category: "Sunscreen", price: 95000, stock: 19 },
  { id: 8, name: "Silk Petal Night Cream", category: "Moisturizer", price: 145000, stock: 12 },
];

const CATEGORY_OPTIONS = ["Semua", "Serum", "Moisturizer", "Mask", "Cleanser", "Toner", "Sunscreen"];
const DUMMY_CUSTOMERS = ["Pelanggan Umum", "Elena Marco", "Alan Chen", "Rina Wijaya"];

function formatRp(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}
function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function SalesPage() {
  const { user } = useAuth();
  const [store] = useState<StoreSettings>(() => loadJSON(STORE_KEY, defaultStore));
  const [receiptSettings] = useState<ReceiptSettings>(() => loadJSON(RECEIPT_KEY, defaultReceipt));

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState(DUMMY_CUSTOMERS[0]);
  const [discountPct, setDiscountPct] = useState(0);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"cash" | "qris" | "card">("cash");
  const [cashInput, setCashInput] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ total: number; change: number } | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  const filteredProducts = useMemo(() => {
    return POS_PRODUCTS.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === "Semua" || p.category === category;
      return matchSearch && matchCategory;
    });
  }, [search, category]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = Math.round((subtotal * discountPct) / 100);
  const total = subtotal - discountAmount;
  const cashValue = Number(cashInput) || 0;
  const change = cashValue - total;

  function addToCart(product: POSProduct) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id !== id) return i;
          const newQty = Math.min(i.stock, Math.max(1, i.qty + delta));
          return { ...i, qty: newQty };
        })
        .filter((i) => i.qty > 0)
    );
  }

  function removeItem(id: number) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  function openPayment() {
    if (cart.length === 0) return;
    setCashInput("");
    setPayMethod("cash");
    setShowPayModal(true);
  }

  function confirmPayment() {
    if (payMethod === "cash" && cashValue < total) return;

    const changeGiven = payMethod === "cash" ? change : 0;
    const transactionId = `TX-${Math.floor(Date.now() / 1000)}`;
    const timestamp = new Date().toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    setSuccessInfo({ total, change: changeGiven });
    setReceiptData({
      transactionId,
      timestamp,
      cashierName: user?.name || "Kasir",
      customer,
      paymentMethod: payMethod,
      items: cart.map((item) => ({ ...item })),
      subtotal,
      discountPct,
      discountAmount,
      total,
      change: changeGiven,
    });
    setCart([]);
    setDiscountPct(0);
    setCustomer(DUMMY_CUSTOMERS[0]);
    setShowPayModal(false);
    setShowReceiptPreview(true);
  }

  function printReceipt() {
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Penjualan / Kasir</h1>
        <p>Mode dummy untuk uji cetak struk · produk dan pelanggan berasal dari data lokal</p>
      </div>

      {successInfo && (
        <div className="success-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="m8 12 3 3 5-6" />
          </svg>
          <div>
            <strong>Transaksi berhasil!</strong> Total {formatRp(successInfo.total)}
            {successInfo.change > 0 && <> · Kembalian {formatRp(successInfo.change)}</>}
          </div>
          <button className="close-x" onClick={() => setSuccessInfo(null)}>×</button>
        </div>
      )}

      <div className="pos-layout">
        {/* Product picker */}
        <div className="card pos-products">
          <div className="products-toolbar">
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="product-grid">
            {filteredProducts.map((p) => {
              const outOfStock = p.stock === 0;
              return (
                <button
                  key={p.id}
                  className="product-tile"
                  disabled={outOfStock}
                  onClick={() => addToCart(p)}
                >
                  <div className="tile-thumb">{initialsOf(p.name)}</div>
                  <div className="tile-name">{p.name}</div>
                  <div className="tile-price">{formatRp(p.price)}</div>
                  <div className={`tile-stock${p.stock <= 10 ? " low" : ""}`}>
                    {outOfStock ? "Stok habis" : `Stok ${p.stock}`}
                  </div>
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="empty-row">Produk tidak ditemukan.</div>
            )}
          </div>
        </div>

        {/* Cart panel */}
        <div className="card pos-cart">
          <div className="card-title-row">
            <h3>Pesanan Saat Ini</h3>
            <span className="muted">{cart.length} item</span>
          </div>

          <select className="customer-select" value={customer} onChange={(e) => setCustomer(e.target.value)}>
            {DUMMY_CUSTOMERS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <div className="cart-list">
            {cart.length === 0 && <div className="cart-empty">Keranjang masih kosong.<br />Klik produk di kiri untuk menambahkan.</div>}
            {cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="ci-info">
                  <div className="ci-name">{item.name}</div>
                  <div className="ci-price">{formatRp(item.price)}</div>
                </div>
                <div className="ci-qty">
                  <button onClick={() => changeQty(item.id, -1)}>−</button>
                  <span>{item.qty}</span>
                  <button onClick={() => changeQty(item.id, 1)} disabled={item.qty >= item.stock}>+</button>
                </div>
                <div className="ci-total">{formatRp(item.price * item.qty)}</div>
                <button className="ci-remove" onClick={() => removeItem(item.id)}>×</button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="row">
              <span>Subtotal</span>
              <span>{formatRp(subtotal)}</span>
            </div>
            <div className="row discount-row">
              <span>Diskon (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPct}
                onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
              />
            </div>
            <div className="row">
              <span>Potongan</span>
              <span>-{formatRp(discountAmount)}</span>
            </div>
            <div className="row total-row">
              <span>Total</span>
              <span>{formatRp(total)}</span>
            </div>
          </div>

          <button className="btn btn-primary btn-block pay-btn" disabled={cart.length === 0} onClick={openPayment}>
            Bayar Sekarang →
          </button>
        </div>
      </div>

      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Pembayaran</h3>

            <div className="pay-total">{formatRp(total)}</div>

            <div className="pay-method-row">
              <button className={`pm-btn${payMethod === "cash" ? " active" : ""}`} onClick={() => setPayMethod("cash")}>Tunai</button>
              <button className={`pm-btn${payMethod === "qris" ? " active" : ""}`} onClick={() => setPayMethod("qris")}>QRIS</button>
              <button className={`pm-btn${payMethod === "card" ? " active" : ""}`} onClick={() => setPayMethod("card")}>Kartu</button>
            </div>

            {payMethod === "cash" && (
              <>
                <label>Uang Diterima</label>
                <input
                  type="number"
                  className="cash-input"
                  placeholder="0"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  autoFocus
                />
                <div className={`change-row${change < 0 ? " negative" : ""}`}>
                  <span>Kembalian</span>
                  <span>{cashValue > 0 ? formatRp(Math.max(0, change)) : "-"}</span>
                </div>
                {cashValue > 0 && change < 0 && (
                  <p className="pay-warning">Uang diterima kurang dari total tagihan.</p>
                )}
              </>
            )}

            {payMethod !== "cash" && (
              <p className="pay-hint">
                Simulasi: klik "Konfirmasi Pembayaran" untuk menandai transaksi {payMethod === "qris" ? "QRIS" : "kartu"} ini sebagai lunas.
              </p>
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowPayModal(false)}>Batal</button>
              <button
                className="btn btn-primary"
                onClick={confirmPayment}
                disabled={payMethod === "cash" && (cashValue < total)}
              >
                Konfirmasi Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiptPreview && receiptData && (
        <div className="modal-overlay" onClick={() => setShowReceiptPreview(false)}>
          <div className="receipt-preview-card" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-print">
              {receiptSettings.showLogo && <img src={logo} alt={store.storeName} className="receipt-logo" />}
              <div className="receipt-title">{store.storeName}</div>
              <div className="receipt-subtitle">{store.address}</div>
              <div className="receipt-subtitle">Telp. {store.phone}</div>
              <div className="receipt-divider receipt-divider-solid" />
              <div className="receipt-meta">No. {receiptData.transactionId}</div>
              <div className="receipt-meta">{receiptData.timestamp}</div>
              <div className="receipt-meta">Kasir: {receiptData.cashierName}</div>
              <div className="receipt-divider" />

              <div className="receipt-row">
                <span>Pelanggan</span>
                <strong>{receiptData.customer}</strong>
              </div>
              <div className="receipt-row">
                <span>Metode</span>
                <strong>{receiptData.paymentMethod === "cash" ? "Tunai" : receiptData.paymentMethod === "qris" ? "QRIS" : "Kartu"}</strong>
              </div>

              <div className="receipt-divider" />
              {receiptData.items.map((item, idx) => (
                <div key={item.id} className="receipt-item-row">
                  <div>
                    <div className="receipt-item-name">{idx + 1}. {item.name}</div>
                    <div className="receipt-item-meta">{item.qty} × {formatRp(item.price)}</div>
                  </div>
                  <div className="receipt-item-total">{formatRp(item.price * item.qty)}</div>
                </div>
              ))}
              <div className="receipt-meta receipt-item-count">{receiptData.items.reduce((s, i) => s + i.qty, 0)} item</div>

              <div className="receipt-divider" />
              <div className="receipt-row">
                <span>Subtotal</span>
                <span>{formatRp(receiptData.subtotal)}</span>
              </div>
              <div className="receipt-row">
                <span>Diskon ({receiptData.discountPct}%)</span>
                <span>-{formatRp(receiptData.discountAmount)}</span>
              </div>
              <div className="receipt-row receipt-total">
                <span>Total</span>
                <span>{formatRp(receiptData.total)}</span>
              </div>
              {receiptData.paymentMethod === "cash" && (
                <div className="receipt-row">
                  <span>Tunai</span>
                  <span>{formatRp(receiptData.total + receiptData.change)}</span>
                </div>
              )}
              {receiptData.change > 0 && (
                <div className="receipt-row">
                  <span>Kembalian</span>
                  <span>{formatRp(receiptData.change)}</span>
                </div>
              )}

              <div className="receipt-divider receipt-divider-solid" />
              <div className="receipt-footer-note">{receiptSettings.footerNote}</div>
              <div className="receipt-thanks">*** Terima Kasih ***</div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowReceiptPreview(false)}>
                Tutup
              </button>
              <button className="btn btn-primary" onClick={printReceipt}>
                Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}