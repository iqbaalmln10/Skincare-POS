import express from "express";
import cors from "cors";
import { initDatabase } from "./db/connection";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";

const app = express();

app.use(cors());
app.use(express.json());

// Route
app.use("/api/health", healthRouter);

// Tambahkan route modul lain di sini:
app.use("/api/auth",         authRouter);
// app.use("/api/products",     productsRouter);
// app.use("/api/transactions", transactionsRouter);
// app.use("/api/customers",    customersRouter);
// app.use("/api/promotions",   promotionsRouter);
// app.use("/api/reports",      reportsRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Inisialisasi DB + jalankan migration sebelum server listen.
initDatabase();

app.listen(PORT, () => {
  console.log(`[backend] Server berjalan di http://localhost:${PORT}`);
});

export default app;
