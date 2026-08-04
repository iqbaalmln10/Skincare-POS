import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth";
import {
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
} from "../services/purchase.service";

export const purchasesRouter = Router();
purchasesRouter.use(authenticate);

purchasesRouter.get("/", (req, res) => {
  const { status } = req.query;
  const orders = listPurchaseOrders({ status: status ? (String(status) as any) : undefined });
  res.json({ success: true, data: orders });
});

purchasesRouter.get("/:id", (req, res) => {
  try {
    const order = getPurchaseOrderById(Number(req.params.id));
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
});

// Pembuatan & pengelolaan PO dibatasi admin — kasir fokus di transaksi penjualan.
// Kalau nanti kasir juga perlu terima barang, tinggal hapus adminOnly di sini.
purchasesRouter.post("/", adminOnly, (req, res) => {
  try {
    const order = createPurchaseOrder({
      supplierId: req.body?.supplierId,
      userId: req.user!.userId,
      note: req.body?.note,
      items: req.body?.items ?? [],
    });
    res.status(201).json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

purchasesRouter.patch("/:id/status", adminOnly, (req, res) => {
  try {
    const { status } = req.body;
    if (status !== "received" && status !== "cancelled") {
      res.status(400).json({
        success: false,
        message: "Status hanya boleh 'received' atau 'cancelled'",
      });
      return;
    }

    const order = updatePurchaseOrderStatus(Number(req.params.id), status, req.user!.userId);
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

purchasesRouter.delete("/:id", adminOnly, (req, res) => {
  try {
    deletePurchaseOrder(Number(req.params.id));
    res.json({ success: true, message: "Purchase order berhasil dihapus" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});


