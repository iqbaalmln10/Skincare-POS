import express from "express";
import cors from "cors";
import { initDatabase } from "./db/connection";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { categoriesRouter } from "./routes/categories";
import { suppliersRouter } from "./routes/suppliers";
import { productsRouter } from "./routes/products";
import { purchasesRouter } from "./routes/purchases";
import { membershipTiersRouter } from "./routes/membership-tiers";
import { customersRouter } from "./routes/customers";
import { promotionsRouter } from "./routes/promotions";

const app = express();

app.use(cors());
app.use(express.json());

// Route
app.use("/api/health", healthRouter);

// Tambahkan route modul lain di sini:
app.use("/api/auth",         authRouter);
app.use("/api/categories",   categoriesRouter);
app.use("/api/suppliers",    suppliersRouter);
app.use("/api/products",     productsRouter);
app.use("/api/purchases",    purchasesRouter);
app.use("/api/membership-tiers", membershipTiersRouter);
app.use("/api/customers",    customersRouter);
app.use("/api/promotions",   promotionsRouter);
// app.use("/api/transactions", transactionsRouter);
// app.use("/api/reports",      reportsRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Inisialisasi DB + jalankan migration sebelum server listen.
initDatabase();

app.listen(PORT, () => {
  console.log(`[backend] Server berjalan di http://localhost:${PORT}`);
});

export default app;
