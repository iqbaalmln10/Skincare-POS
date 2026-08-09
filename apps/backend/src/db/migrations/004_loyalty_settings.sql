-- -----------------------------------------------------------------
-- 004. Loyalty settings: satu baris konfigurasi ("singleton") untuk
-- aturan perolehan poin per transaksi, diminta Iqbal supaya admin bisa
-- atur sendiri lewat menu Customers (bukan hardcode di kode).
--
-- Batas atas/bawah (CHECK) sengaja dipasang biar tidak disalahgunakan:
-- Rp1.000 - Rp100.000 per 1 poin. Di bawah itu terlalu royal (rawan
-- disalahgunakan buat "bocorin" poin), di atas itu programnya jadi
-- nyaris tidak berarti buat pelanggan.
--
-- CATATAN PENTING: tabel ini baru menyimpan ATURANNYA. Belum ada modul
-- Sales/checkout di backend (belum ada routes/services/sales.ts sama
-- sekali di repo ini), jadi poin belum benar-benar ke-otomatis-kredit
-- ke pelanggan manapun lewat transaksi nyata. Begitu modul Sales
-- dibangun, tinggal baca nilai `points_per_amount` dari sini.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),
  points_per_amount  INTEGER NOT NULL DEFAULT 10000
                       CHECK (points_per_amount BETWEEN 1000 AND 100000),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO loyalty_settings (id, points_per_amount) VALUES (1, 10000);
