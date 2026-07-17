import { useMemo, useState } from "react";
import "./PurchasesPage.css";

type POStatus = "pending" | "received" | "cancelled";

interface POItem {
  productName: string;
  qty: number;
  unitCost: number;
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplier: string;
  date: string;
  items: POItem[];
  totalAmount: number;
  status: POStatus;
  note: string;
}

// 🔶 DATA DUMMY — state lokal saja, belum nyambung ke backend/database
const SUPPLIERS = ["Aura Organic Labs", "Velvet Glow Co.", "Luxe Scents Int.", "Radiance Logistics"];
const PRODUCT_OPTIONS = [
  "Radiance Rose Serum",
  "Deep Sea Hydra Cream",
  "Detox Charcoal Mask",
  "Hydro Marine Cleanser",
  "Botanical Oil Cleanser",
  "Velvet Glow Toner",
];

const initialOrders: PurchaseOrder[] = [
  {
    id: 1, poNumber: "APO-13541", supplier: "Aura Organic Labs", date: "2025-10-20",
    items: [{ productName: "Radiance Rose Serum", qty: 50, unitCost: 45000 }],
    totalAmount: 4250000, status: "received", note: "",
  },
  {
    id: 2, poNumber: "APO-13542", supplier: "Velvet Glow Co.", date: "2025-10-19",
    items: [{ productName: "Velvet Glow Toner", qty: 30, unitCost: 40000 }],
    totalAmount: 1890000, status: "pending", note: "",
  },
  {
    id: 3, poNumber: "APO-13543", supplier: "Luxe Scents Int.", date: "2025-10-18",
    items: [{ productName: "Deep Sea Hydra Cream", qty: 100, unitCost: 62000 }],
    totalAmount: 12400000, status: "received", note: "",
  },
  {
    id: 4, poNumber: "APO-13544", supplier: "Radiance Logistics", date: "2025-10-18",
    items: [{ productName: "Botanical Oil Cleanser", qty: 20, unitCost: 33000 }],
    totalAmount: 850000, status: "cancelled", note: "Supplier kehabisan stok",
  },
];

const statusLabel: Record<POStatus, { text: string; cls: string }> = {
  pending: { text: "Pending", cls: "status-pending" },
  received: { text: "Received", cls: "status-paid" },
  cancelled: { text: "Cancelled", cls: "status-overdue" },
};

function formatRp(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}
function formatDateID(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function generatePoNumber(existing: PurchaseOrder[]) {
  const nums = existing.map((o) => Number(o.poNumber.replace(/\D/g, "")) || 0);
  return `APO-${(Math.max(0, ...nums) + 1).toString().padStart(5, "0")}`;
}

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(initialOrders);
  const [supplier, setSupplier] = useState(SUPPLIERS[0]);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<POItem[]>([{ productName: PRODUCT_OPTIONS[0], qty: 1, unitCost: 0 }]);

  const stats = useMemo(() => {
    const totalPO = orders.length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const thisMonthValue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + o.totalAmount, 0);
    return { totalPO, pending, thisMonthValue };
  }, [orders]);

  const draftTotal = items.reduce((s, i) => s + i.qty * i.unitCost, 0);

  function addItemRow() {
    setItems((prev) => [...prev, { productName: PRODUCT_OPTIONS[0], qty: 1, unitCost: 0 }]);
  }
  function removeItemRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, patch: Partial<POItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function resetForm() {
    setSupplier(SUPPLIERS[0]);
    setNote("");
    setItems([{ productName: PRODUCT_OPTIONS[0], qty: 1, unitCost: 0 }]);
  }

  function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((i) => i.qty > 0 && i.unitCost >= 0);
    if (validItems.length === 0) return;

    const newPO: PurchaseOrder = {
      id: Math.max(0, ...orders.map((o) => o.id)) + 1,
      poNumber: generatePoNumber(orders),
      supplier,
      date: new Date().toISOString().slice(0, 10),
      items: validItems,
      totalAmount: draftTotal,
      status: "pending",
      note,
    };

    setOrders((prev) => [newPO, ...prev]);
    resetForm();
  }

  function setStatus(id: number, status: POStatus) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  function handleDelete(id: number) {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <>
      <div className="page-head">
        <h1>Purchases</h1>
        <p>Buat dan kelola pesanan pembelian ke supplier</p>
      </div>

      <div className="grid-3">
        <div className="card kpi-card">
          <div className="kpi-label">Total Purchase Order</div>
          <div className="kpi-value">{stats.totalPO}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Menunggu Konfirmasi</div>
          <div className="kpi-value">{stats.pending}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Nilai Pembelian (Aktif)</div>
          <div className="kpi-value">{formatRp(stats.thisMonthValue)}</div>
        </div>
      </div>

      <div className="grid-2 purchases-grid mt-20">
        <div className="card">
          <div className="card-title-row">
            <h3>New Restock Order</h3>
          </div>

          <form onSubmit={handleCreatePO} className="po-form">
            <label>Supplier</label>
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              {SUPPLIERS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <label>Item Pesanan</label>
            <div className="po-items">
              {items.map((item, idx) => (
                <div className="po-item-row" key={idx}>
                  <select
                    value={item.productName}
                    onChange={(e) => updateItem(idx, { productName: e.target.value })}
                  >
                    {PRODUCT_OPTIONS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="qty-input"
                    value={item.qty}
                    onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                    placeholder="Qty"
                  />
                  <input
                    type="number"
                    min={0}
                    className="cost-input"
                    value={item.unitCost}
                    onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value) })}
                    placeholder="Harga satuan"
                  />
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => removeItemRow(idx)}
                    disabled={items.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="add-row-btn" onClick={addItemRow}>
              + Tambah item
            </button>

            <label>Catatan (opsional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan untuk supplier..."
              rows={2}
            />

            <div className="po-total-box">
              <span>Total Pesanan</span>
              <strong>{formatRp(draftTotal)}</strong>
            </div>

            <button type="submit" className="btn btn-primary btn-block po-submit">
              Buat Purchase Order
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title-row">
            <h3>Riwayat Purchase Orders</h3>
            <span className="muted">{orders.length} PO</span>
          </div>

          <div className="po-history-list">
            {orders.map((o) => (
              <div className="po-history-item" key={o.id}>
                <div className="po-hist-top">
                  <div>
                    <div className="po-number">{o.poNumber}</div>
                    <div className="po-supplier">{o.supplier} · {formatDateID(o.date)}</div>
                  </div>
                  <span className={`status-pill ${statusLabel[o.status].cls}`}>
                    {statusLabel[o.status].text}
                  </span>
                </div>
                <div className="po-hist-items">
                  {o.items.map((it, i) => (
                    <div key={i}>{it.productName} × {it.qty}</div>
                  ))}
                </div>
                <div className="po-hist-bottom">
                  <div className="po-hist-total">{formatRp(o.totalAmount)}</div>
                  <div className="po-hist-actions">
                    {o.status === "pending" && (
                      <>
                        <button className="mini-btn" onClick={() => setStatus(o.id, "received")}>Terima</button>
                        <button className="mini-btn danger" onClick={() => setStatus(o.id, "cancelled")}>Batalkan</button>
                      </>
                    )}
                    <button className="icon-btn danger" onClick={() => handleDelete(o.id)} title="Hapus">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <div className="empty-row">Belum ada purchase order.</div>}
          </div>
        </div>
      </div>
    </>
  );
}