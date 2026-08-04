import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth";
import {
  listPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  togglePromotionActive,
  deletePromotion,
} from "../services/promotion.service";

export const promotionsRouter = Router();
promotionsRouter.use(authenticate);

promotionsRouter.get("/", (_req, res) => {
  res.json({ success: true, data: listPromotions() });
});

promotionsRouter.get("/:id", (req, res) => {
  try {
    res.json({ success: true, data: getPromotionById(Number(req.params.id)) });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
});

promotionsRouter.post("/", adminOnly, (req, res) => {
  try {
    const promo = createPromotion(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: promo });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

promotionsRouter.put("/:id", adminOnly, (req, res) => {
  try {
    const promo = updatePromotion(Number(req.params.id), req.body);
    res.json({ success: true, data: promo });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

promotionsRouter.patch("/:id/toggle-active", adminOnly, (req, res) => {
  try {
    const promo = togglePromotionActive(Number(req.params.id));
    res.json({ success: true, data: promo });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

promotionsRouter.delete("/:id", adminOnly, (req, res) => {
  try {
    deletePromotion(Number(req.params.id));
    res.json({ success: true, message: "Promo berhasil dihapus" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
