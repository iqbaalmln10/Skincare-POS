-- -----------------------------------------------------------------
-- 002. FIX: customers kehilangan kolom is_active di schema awal.
-- Frontend CustomersPage.tsx sudah punya toggle status aktif/nonaktif,
-- tapi kolomnya tidak pernah ada di 001_initial_schema.sql — bug murni
-- di desain awal, ditambal di sini alih-alih mengedit migration lama.
-- -----------------------------------------------------------------
ALTER TABLE customers ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1
  CHECK (is_active IN (0, 1));

-- Catatan: tier membership (Reguler/Silver/Gold/Platinum) TIDAK di-seed di
-- sini — sudah ada di 001_initial_schema.sql baris ~441 lewat
-- INSERT OR IGNORE INTO membership_tiers. Sempat mau ditambah lagi di sini
-- secara keliru (lolos dari grep pertama saat analisis), untung ketahuan
-- sebelum dikirim ke Iqbal.
