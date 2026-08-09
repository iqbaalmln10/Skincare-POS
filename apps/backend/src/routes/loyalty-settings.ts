import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth";
import { getLoyaltySettings, updateLoyaltySettings } from "../services/loyalty-settings.service";

export const loyaltySettingsRouter = Router();
loyaltySettingsRouter.use(authenticate);

loyaltySettingsRouter.get("/", (_req, res) => {
  res.json({ success: true, data: getLoyaltySettings() });
});

loyaltySettingsRouter.put("/", adminOnly, (req, res) => {
  try {
    const settings = updateLoyaltySettings(Number(req.body.pointsPerAmount));
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
