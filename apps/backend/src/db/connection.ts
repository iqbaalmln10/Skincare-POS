import Database from "better-sqlite3";
import path from "path";
import { runMigrations } from "./migrate";

const DB_PATH =
  process.env.DB_PATH ||
  path.join(__dirname, "../../kasir.db");

// Singleton connection — satu instance dipakai seluruh backend.
export const db = new Database(DB_PATH);

/**
 * Inisialisasi database:
 * 1. Aktifkan WAL mode dan foreign keys.
 * 2. Jalankan migration yang belum dieksekusi.
 * Dipanggil sekali saat server start.
 */
export function initDatabase(): void {
  console.log(`[db] Koneksi ke database: ${DB_PATH}`);
  runMigrations(db);
}
