-- -----------------------------------------------------------------
-- 006. Akun owner awal untuk instalasi baru.
-- Password awal: owner123
-- Password disimpan sebagai bcrypt hash, bukan plaintext.
-- INSERT OR IGNORE menjaga akun yang sudah ada tetap tidak tertimpa.
-- -----------------------------------------------------------------
INSERT OR IGNORE INTO users (
  name, email, password, role, is_active, created_at, updated_at
) VALUES (
  'Owner',
  'owner@skincarepos.local',
  '$2b$10$2uSaG19g1p.7Zv587fn9ae6KetUGzFHtS0CL5SHT6l7Gjin70CjOS',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);