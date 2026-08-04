import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  toggleSupplierActive,
} from "../services/supplier.service";

export const suppliersRouter = Router();
suppliersRouter.use(authenticate);

suppliersRouter.get("/", (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  const suppliers = listSuppliers(includeInactive);
  res.json({ success: true, data: suppliers });
});

suppliersRouter.get("/:id", (req, res) => {
  try {
    const supplier = getSupplierById(Number(req.params.id));
    res.json({ success: true, data: supplier });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
});

suppliersRouter.post("/", (req, res) => {
  try {
    const supplier = createSupplier(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

suppliersRouter.put("/:id", (req, res) => {
  try {
    const supplier = updateSupplier(Number(req.params.id), req.body);
    res.json({ success: true, data: supplier });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

suppliersRouter.patch("/:id/toggle-active", (req, res) => {
  try {
    const supplier = toggleSupplierActive(Number(req.params.id));
    res.json({ success: true, data: supplier });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});


