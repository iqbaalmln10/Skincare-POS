import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createCheckoutTransaction } from "../services/transaction.service";

export const transactionsRouter = Router();
transactionsRouter.use(authenticate);

transactionsRouter.post("/checkout", (req, res) => {
  try {
    const transaction = createCheckoutTransaction(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: transaction });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
