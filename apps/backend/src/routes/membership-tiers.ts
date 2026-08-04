import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listMembershipTiers } from "../services/membership-tier.service";

export const membershipTiersRouter = Router();
membershipTiersRouter.use(authenticate);

membershipTiersRouter.get("/", (_req, res) => {
  res.json({ success: true, data: listMembershipTiers() });
});
