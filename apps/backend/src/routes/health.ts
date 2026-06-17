import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ success: true, message: "Backend kasir skincare aktif" });
});
