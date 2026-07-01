import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

/**
 * Menjalankan semua file migration SQL yang belum dieksekusi.
 * File dibaca dari folder migrations/, diurutkan berdasarkan nama (001_, 002_, dst).
 * Versi migration yang sudah berjalan dicatat di tabel `_migrations` di database.
 */
export function runMigrations(db: Database.Database): void {
  // Aktifkan foreign keys tiap kali koneksi dibuka (SQLite perlu ini eksplisit).
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  // Buat tabel tracker migrasi jika belum ada.
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      filename   TEXT    NOT NULL UNIQUE,
      applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = path.join(__dirname, "migrations");

  // Baca semua file .sql, urutkan agar 001_ selalu sebelum 002_, dst.
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Query cek migration yang sudah pernah dijalankan.
  const applied = db
    .prepare("SELECT filename FROM _migrations")
    .all()
    .map((r: any) => r.filename as string);

  for (const file of files) {
    if (applied.includes(file)) {
      // Sudah dijalankan sebelumnya, skip.
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

    console.log(`[migration] Menjalankan: ${file}`);

    // Jalankan seluruh isi SQL dalam satu transaksi.
    // Kalau ada error di tengah, seluruh migration file di-rollback.
    db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (filename) VALUES (?)").run(file);
    })();

    console.log(`[migration] Selesai: ${file}`);
  }

  console.log("[migration] Semua migration sudah up to date.");
}
