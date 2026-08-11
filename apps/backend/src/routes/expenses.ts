import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth";
import { listExpenses, createExpense, deleteExpense } from "../services/expense.service";

export const expensesRouter = Router();
expensesRouter.use(authenticate);

// GET /api/expenses?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
expensesRouter.get("/", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const rows = listExpenses(
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat data pengeluaran" });
  }
});

// Admin & kasir sama-sama boleh mencatat pengeluaran operasional harian
// (mis. kasir beli plastik/kertas struk, admin bayar listrik/sewa).
expensesRouter.post("/", (req, res) => {
  try {
    const expense = createExpense({
      userId: req.user!.userId,
      description: req.body?.description,
      amount: Number(req.body?.amount),
    });
    res.status(201).json({ success: true, data: expense });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Hapus dibatasi admin — supaya kasir tidak bisa menghilangkan jejak
// pengeluaran yang sudah tercatat (audit trail kas).
expensesRouter.delete("/:id", adminOnly, (req, res) => {
  try {
    deleteExpense(Number(req.params.id), req.user!.userId);
    res.json({ success: true, message: "Data pengeluaran berhasil dihapus" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
