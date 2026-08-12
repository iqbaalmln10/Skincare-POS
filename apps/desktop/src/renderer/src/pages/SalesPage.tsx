import { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
import { API_BASE } from "../lib/api";
import BarcodeScannerModal from "../components/BarcodeScannerModal";
import "./SalesPage.css";

interface POSProduct {
  id: number;
  name: string;
  categoryName: string | null;
  sellingPrice: number;
  stockQty: number;
  barcode: string | null;
  imagePath: string | null;
}

interface CartItem extends POSProduct {
  qty: number;
  promoName: string | null;
  promoDiscount: number;
}

interface PromotionDTO {
  id: number;
  name: string;
  type: "percent" | "fixed_amount";
  value: number;
  scope: "all_products" | "specific_product";
  startDate: string;
  endDate: string;
  isActive: boolean;
  productIds: number[];
}

interface CustomerDTO {
  id: number;
  name: string;
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

  const [products, setProducts] = useState<POSProduct[]>([]);
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [promotions, setPromotions] = useState<PromotionDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [discountPct, setDiscountPct] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMessage, setScannerMessage] = useState<string | null>(null);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"cash" | "qris" | "card">("cash");
  const [cashInput, setCashInput] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ total: number; change: number } | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(true);
      const params: Record<string, string> = { includeInactive: "true" };
      if (search.trim()) params.search = search.trim();

      axios
        .get(`${API_BASE}/products`, { params })
        .then((res) => {
          const productList = (res.data.data || []) as POSProduct[];
          setProducts(productList);
          setErrorMsg(null);
        })
        .catch(() => setErrorMsg("Gagal memuat produk dari backend."))
        .finally(() => setIsLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/customers`, { params: { includeInactive: "false" } })
      .then((res) => {
        const list = (res.data.data || []) as CustomerDTO[];
        setCustomers(list);
        setSelectedCustomerId((current) => {
          if (current === null) return null;
          return list.some((customer) => customer.id === current) ? current : null;
        });
      })
      .catch(() => setErrorMsg("Gagal memuat pelanggan."));

    axios
      .get(`${API_BASE}/promotions`)
      .then((res) => setPromotions(res.data.data || []))
      .catch(() => setPromotions([]));
  }, []);

  const categoryOptions = useMemo(() => {
    const names = products.map((p) => p.categoryName || "Umum");
    return ["Semua", ...Array.from(new Set(names))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = [p.name, p.barcode, p.id.toString()]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search.toLowerCase()));
      const matchCategory = category === "Semua" || (p.categoryName || "Umum") === category;
      return matchSearch && matchCategory;
    });
  }, [products, search, category]);

  const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.qty, 0);
  const promoDiscountAmount = cart.reduce((sum, item) => sum + item.promoDiscount * item.qty, 0);
  const manualDiscountAmount = Math.round((subtotal * discountPct) / 100);
  const totalDiscountAmount = promoDiscountAmount + manualDiscountAmount;
  const total = subtotal - totalDiscountAmount;
  const cashValue = Number(cashInput) || 0;
  const change = cashValue - total;

  function getApplicablePromo(product: POSProduct) {
    const today = new Date().toISOString().slice(0, 10);
    const matches = promotions.filter((promo) => {
      if (!promo.isActive) return false;
      if (today < promo.startDate || today > promo.endDate) return false;
      return promo.scope === "all_products" || promo.productIds.includes(product.id);
    });

    if (matches.length === 0) return null;

    let best: { amount: number; name: string } | null = null;

    for (const promo of matches) {
      let amount = 0;
      if (promo.type === "percent") {
        amount = Math.round(product.sellingPrice * promo.value / 100);
      } else {
        amount = Math.min(product.sellingPrice, promo.value);
      }

      if (!best || amount > best.amount) {
        best = { amount, name: promo.name };
      }
    }

    return best;
  }

  function addToCart(product: POSProduct) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stockQty) return prev;
        return prev.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }

      const promo = getApplicablePromo(product);
      return [
        ...prev,
        {
          ...product,
          qty: 1,
          promoName: promo?.name ?? null,
          promoDiscount: promo?.amount ?? 0,
        },
      ];
    });
    setErrorMsg(null);
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const newQty = Math.min(item.stockQty, Math.max(1, item.qty + delta));
          return { ...item, qty: newQty };
        })
        .filter((item) => item.qty > 0)
    );
  }

  function removeItem(id: number) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  function openPayment() {
    if (cart.length === 0) return;
    setCashInput("");
    setPayMethod("cash");
    setShowPayModal(true);
  }

  async function confirmPayment() {
    if (payMethod === "cash" && cashValue < total) return;

    const customerName = selectedCustomerId
      ? customers.find((customer) => customer.id === selectedCustomerId)?.name || "Pelanggan Umum"
      : "Pelanggan Umum";

    try {
      const res = await axios.post(`${API_BASE}/transactions/checkout`, {
        customerId: selectedCustomerId ?? null,
        paymentMethod: payMethod === "card" ? "transfer" : payMethod,
        paidAmount: payMethod === "cash" ? cashValue : total,
        manualDiscountAmount,
        items: cart.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.qty,
          unitPrice: item.sellingPrice,
          discountAmount: item.promoDiscount * item.qty,
          subtotal: item.sellingPrice * item.qty - item.promoDiscount * item.qty,
        })),
      });

      const changeGiven = payMethod === "cash" ? change : 0;
      const timestamp = new Date().toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      setSuccessInfo({ total: res.data.data.totalAmount, change: changeGiven });
      setReceiptData({
        transactionId: res.data.data.invoiceNumber,
        timestamp,
        cashierName: user?.name || "Kasir",
        customer: customerName,
        paymentMethod: payMethod,
        items: cart.map((item) => ({ ...item })),
        subtotal,
        discountPct,
        discountAmount: totalDiscountAmount,
        total: res.data.data.totalAmount,
        change: changeGiven,
      });
      setCart([]);
      setDiscountPct(0);
      setSelectedCustomerId(customers[0]?.id ?? null);
      setShowPayModal(false);
      setShowReceiptPreview(true);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Transaksi gagal disimpan.");
    }
  }

  async function printReceipt() {
    if (!receiptData) return;

    const payload = {
      storeName: store.storeName,
      address: store.address,
      phone: store.phone,
      transactionId: receiptData.transactionId,
      timestamp: receiptData.timestamp,
      cashierName: receiptData.cashierName,
      customer: receiptData.customer,
      paymentMethod: receiptData.paymentMethod === "cash" ? "Tunai" : receiptData.paymentMethod === "qris" ? "QRIS" : "Kartu",
      items: receiptData.items.map((item) => ({
        name: item.name,
        qty: item.qty,
        price: item.sellingPrice,
      })),
      subtotal: receiptData.subtotal,
      discountAmount: receiptData.discountAmount,
      total: receiptData.total,
      change: receiptData.change,
      footerNote: receiptSettings.footerNote,
    };

    try {
      const result = await (window as any).electronAPI.printReceipt(payload);
      if (!result?.success) {
        setErrorMsg(result?.message || "Gagal mencetak struk.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mencetak struk.");
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Penjualan / Kasir</h1>
        <p>Produk, pelanggan, promo, dan struk kini terhubung ke backend.</p>
      </div>

      {errorMsg && (
        <div className="error-banner">
          <strong>Perhatian:</strong> {errorMsg}
        </div>
      )}

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
        <div className="card pos-products">
          <div className="products-toolbar">
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                placeholder="Cari produk / barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-outline scan-btn" type="button" onClick={() => setShowScanner(true)}>
              Scan Barcode
            </button>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoryOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {scannerMessage && <div className="scanner-message">{scannerMessage}</div>}

          <div className="product-grid">
            {isLoading && <div className="empty-row">Memuat produk...</div>}
            {!isLoading && filteredProducts.map((product) => {
              const outOfStock = product.stockQty === 0;
              const promo = getApplicablePromo(product);
              return (
                <button
                  key={product.id}
                  className="product-tile"
                  disabled={outOfStock}
                  onClick={() => addToCart(product)}
                >
                  <div className="tile-thumb">
                    {product.imagePath ? <img src={product.imagePath} alt={product.name} /> : initialsOf(product.name)}
                  </div>
                  <div className="tile-name">{product.name}</div>
                  <div className="tile-price">{formatRp(product.sellingPrice)}</div>
                  {promo && <div className="tile-promo">Promo {promo.name}</div>}
                  <div className={`tile-stock${product.stockQty <= 10 ? " low" : ""}`}>
                    {outOfStock ? "Stok habis" : `Stok ${product.stockQty}`}
                  </div>
                </button>
              );
            })}
            {!isLoading && filteredProducts.length === 0 && (
              <div className="empty-row">Produk tidak ditemukan.</div>
            )}
          </div>
        </div>

        <div className="card pos-cart">
          <div className="card-title-row">
            <h3>Pesanan Saat Ini</h3>
            <span className="muted">{cart.length} item</span>
          </div>

          <select
            className="customer-select"
            value={selectedCustomerId ?? ""}
            onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Pelanggan Umum</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>

          <div className="cart-list">
            {cart.length === 0 && <div className="cart-empty">Keranjang masih kosong.<br />Klik/scan produk untuk menambahkan.</div>}
            {cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="ci-info">
                  <div className="ci-name">{item.name}</div>
                  <div className="ci-price">{formatRp(item.sellingPrice)}</div>
                  {item.promoName && <div className="ci-promo">{item.promoName}</div>}
                </div>
                <div className="ci-qty">
                  <button onClick={() => changeQty(item.id, -1)}>−</button>
                  <span>{item.qty}</span>
                  <button onClick={() => changeQty(item.id, 1)} disabled={item.qty >= item.stockQty}>+</button>
                </div>
                <div className="ci-total">{formatRp(item.sellingPrice * item.qty)}</div>
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
              <span>Diskon tambahan (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={discountPct}
                onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
              />
            </div>
            <div className="row">
              <span>Promo otomatis</span>
              <span>-{formatRp(promoDiscountAmount)}</span>
            </div>
            <div className="row">
              <span>Potongan</span>
              <span>-{formatRp(totalDiscountAmount)}</span>
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
                Simulasi: klik “Konfirmasi Pembayaran” untuk menandai transaksi {payMethod === "qris" ? "QRIS" : "kartu"} ini sebagai lunas.
              </p>
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowPayModal(false)}>Batal</button>
              <button
                className="btn btn-primary"
                onClick={confirmPayment}
                disabled={payMethod === "cash" && cashValue < total}
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
                    <div className="receipt-item-meta">{item.qty} × {formatRp(item.sellingPrice)}</div>
                  </div>
                  <div className="receipt-item-total">{formatRp(item.sellingPrice * item.qty)}</div>
                </div>
              ))}
              <div className="receipt-meta receipt-item-count">{receiptData.items.reduce((sum, item) => sum + item.qty, 0)} item</div>

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

      {showScanner && (
        <BarcodeScannerModal
          onDetected={(code) => {
            const match = products.find((product) => product.barcode === code);
            if (match) {
              addToCart(match);
              setScannerMessage(`Produk ditambahkan: ${match.name}`);
            } else {
              setScannerMessage(`Barcode ${code} tidak ditemukan.`);
            }
            setShowScanner(false);
          }}
          onClose={() => {
            setShowScanner(false);
            setScannerMessage(null);
          }}
        />
      )}
    </>
  );
}