import Database from "better-sqlite3";
import path from "path";

// Lokasi file database. Saat dibungkus Electron, path ini akan
// diarahkan ke folder userData OS (lihat catatan di apps/desktop nanti).
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../kasir.db");

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL"); // standar untuk performa tulis SQLite

export function runMigrations() {
  // TODO: jalankan file .sql migrasi sesuai schema DBML di sini.
  // Untuk sekarang hanya placeholder agar struktur jelas.
  console.log("[db] Migrasi belum diisi — tambahkan sesuai schema DBML.");
}
