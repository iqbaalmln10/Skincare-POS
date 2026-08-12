-- -----------------------------------------------------------------
-- 005. Pengeluaran Operasional (harian, tidak terikat shift kasir)
--
-- Tabel `expenses` sebelumnya cuma dipakai internal buat hitung
-- expected_cash saat tutup shift (shift_id NOT NULL, lihat migration
-- 001 & attendance.service.ts). Sekarang tabel yang sama dipakai juga
-- sebagai fitur "Pengeluaran Operasional" di sidebar — admin/kasir
-- bisa mencatat pengeluaran (sewa, listrik, ongkir, dll) kapan saja,
-- tidak wajib sedang dalam shift aktif.
--
-- SQLite tidak bisa ALTER COLUMN untuk melepas NOT NULL, jadi tabel
-- dibuat ulang dengan shift_id nullable lalu data lama disalin persis.
-- -----------------------------------------------------------------

CREATE TABLE expenses_new (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  shift_id    INTEGER REFERENCES shifts(id),
  description TEXT    NOT NULL,
  amount      REAL    NOT NULL CHECK (amount > 0),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO expenses_new (id, user_id, shift_id, description, amount, created_at)
  SELECT id, user_id, shift_id, description, amount, created_at FROM expenses;

DROP TABLE expenses;
ALTER TABLE expenses_new RENAME TO expenses;

CREATE INDEX IF NOT EXISTS idx_expenses_shift    ON expenses (shift_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created  ON expenses (created_at);
