import { Router } from "express";
import { authenticate, adminOnly } from "../middleware/auth";
import {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  toggleCategoryActive,
  deleteCategory,
} from "../services/category.service";

export const categoriesRouter = Router();
categoriesRouter.use(authenticate);

categoriesRouter.get("/", (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  const categories = listCategories(includeInactive);
  res.json({ success: true, data: categories });
});

categoriesRouter.get("/:id", (req, res) => {
  try {
    const category = getCategoryById(Number(req.params.id));
    res.json({ success: true, data: category });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
});

categoriesRouter.post("/", adminOnly, (req, res) => {
  try {
    const category = createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

categoriesRouter.put("/:id", adminOnly, (req, res) => {
  try {
    const category = updateCategory(Number(req.params.id), req.body);
    res.json({ success: true, data: category });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

categoriesRouter.patch("/:id/toggle-active", adminOnly, (req, res) => {
  try {
    const category = toggleCategoryActive(Number(req.params.id));
    res.json({ success: true, data: category });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

categoriesRouter.delete("/:id", adminOnly, (req, res) => {
  try {
    deleteCategory(Number(req.params.id));
    res.json({ success: true, message: "Kategori berhasil dihapus" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
