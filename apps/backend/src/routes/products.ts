import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth";
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductActive,
  deleteProduct,
} from "../services/product.service";

export const productsRouter = Router();
productsRouter.use(authenticate);

productsRouter.get("/", (req, res) => {
  const { search, categoryId, supplierId, includeInactive } = req.query;

  const products = listProducts({
    search: search ? String(search) : undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    supplierId: supplierId ? Number(supplierId) : undefined,
    includeInactive: includeInactive === "true",
  });

  res.json({ success: true, data: products });
});

productsRouter.get("/:id", (req, res) => {
  try {
    const product = getProductById(Number(req.params.id));
    res.json({ success: true, data: product });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
});

productsRouter.post("/", adminOnly, (req, res) => {
  try {
    const product = createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

productsRouter.put("/:id", adminOnly, (req, res) => {
  try {
    const product = updateProduct(Number(req.params.id), req.body);
    res.json({ success: true, data: product });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

productsRouter.patch("/:id/toggle-active", adminOnly, (req, res) => {
  try {
    const product = toggleProductActive(Number(req.params.id));
    res.json({ success: true, data: product });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

productsRouter.delete("/:id", adminOnly, (req, res) => {
  try {
    deleteProduct(Number(req.params.id));
    res.json({ success: true, message: "Produk berhasil dihapus" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});


