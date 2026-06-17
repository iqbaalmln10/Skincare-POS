import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);

// TODO: tambahkan route lain di sini sesuai modul:
// app.use("/api/products", productsRouter);
// app.use("/api/transactions", transactionsRouter);
// app.use("/api/customers", customersRouter);
// app.use("/api/auth", authRouter); // termasuk endpoint tap RFID

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`[backend] Server berjalan di http://localhost:${PORT}`);
});

export default app;
