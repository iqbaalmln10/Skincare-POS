import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listCategories, createCategory } from "../services/category.service";

export const categoriesRouter = Router();
categoriesRouter.use(authenticate);

categoriesRouter.get("/", (_req, res) => {
  const categories = listCategories();
  res.json({ success: true, data: categories });
});

categoriesRouter.post("/", (req, res) => {
  try {
    const category = createCategory(req.body?.name);
    res.status(201).json({ success: true, data: category });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});


