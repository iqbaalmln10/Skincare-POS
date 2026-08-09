import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth";
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  toggleCustomerActive,
  deleteCustomer,
  resetCustomerPoints,
} from "../services/customer.service";

export const customersRouter = Router();
customersRouter.use(authenticate);

customersRouter.get("/", (req, res) => {
  const { search, tierId, includeInactive } = req.query;
  const customers = listCustomers({
    search: search ? String(search) : undefined,
    tierId: tierId ? Number(tierId) : undefined,
    includeInactive: includeInactive === "true",
  });
  res.json({ success: true, data: customers });
});

customersRouter.get("/:id", (req, res) => {
  try {
    res.json({ success: true, data: getCustomerById(Number(req.params.id)) });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
});

customersRouter.post("/", (req, res) => {
  try {
    const customer = createCustomer(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

customersRouter.put("/:id", (req, res) => {
  try {
    const customer = updateCustomer(Number(req.params.id), req.body);
    res.json({ success: true, data: customer });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

customersRouter.patch("/:id/toggle-active", (req, res) => {
  try {
    const customer = toggleCustomerActive(Number(req.params.id));
    res.json({ success: true, data: customer });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

customersRouter.post("/:id/reset-points", adminOnly, (req, res) => {
  try {
    const customer = resetCustomerPoints(Number(req.params.id));
    res.json({ success: true, data: customer });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

customersRouter.delete("/:id", (req, res) => {
  try {
    deleteCustomer(Number(req.params.id));
    res.json({ success: true, message: "Pelanggan berhasil dihapus" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
