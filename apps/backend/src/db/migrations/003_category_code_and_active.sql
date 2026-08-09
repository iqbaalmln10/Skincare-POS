-- -----------------------------------------------------------------
-- 003. Kategori: tambah kolom `code` (prefix SKU per kategori) dan
-- `is_active` (soft-delete), menyusul permintaan Iqbal untuk CRUD
-- kategori penuh + auto-SKU berbasis kode kategori.
--
-- `code` dibuat NULL-able dulu supaya baris lama tidak pecah, lalu
-- di-backfill dari 3 huruf pertama nama (uppercase) sebagai default
-- yang masuk akal, dan terakhir baru dipasangi constraint UNIQUE lewat
-- index. SQLite tidak bisa ALTER COLUMN ADD ... NOT NULL UNIQUE
-- langsung di tabel yang sudah berisi data tanpa backfill dulu.
-- -----------------------------------------------------------------
ALTER TABLE categories ADD COLUMN code TEXT;
ALTER TABLE categories ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1
  CHECK (is_active IN (0, 1));

UPDATE categories
SET code = UPPER(SUBSTR(REPLACE(name, ' ', ''), 1, 3))
WHERE code IS NULL;

-- Jaga-jaga kalau ada 2+ kategori lama yang nama-nya nyerempet mirip
-- (mis. "Serum & Ampoule" vs "Sepatu" sama-sama jadi "SER") sehingga
-- hasil backfill di atas bentrok: kategori dengan id terkecil per kode
-- yang menang pakai kode "bersih", sisanya ditempeli id supaya tetap unik
-- tanpa perlu window function (menghindari ketergantungan versi SQLite).
UPDATE categories
SET code = code || id
WHERE id NOT IN (SELECT MIN(id) FROM categories GROUP BY code);

-- Kategori tanpa produk sama sekali dipakai sebagai fallback prefix SKU
-- ("GEN-0001", dst) saat produk dibuat tanpa kategori.
INSERT OR IGNORE INTO categories (name, slug, code)
VALUES ('Umum', 'umum', 'GEN');

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_code ON categories(code);
