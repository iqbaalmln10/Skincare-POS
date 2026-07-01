-- =================================================================
-- SKINCARE POS — Initial Schema Migration
-- File  : 001_initial_schema.sql
-- DB    : SQLite (via better-sqlite3)
-- Urutan CREATE TABLE diatur ketat mengikuti dependency FK.
-- Jalankan sekali saat aplikasi pertama kali diinstall.
-- =================================================================


-- -----------------------------------------------------------------
-- 1. USERS
-- Tabel paling dasar — tidak bergantung ke tabel lain.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL UNIQUE,
  -- password disimpan sebagai bcrypt hash, BUKAN plaintext.
  password   TEXT    NOT NULL,
  phone      TEXT,
  -- Nilai valid: 'admin' | 'kasir'
  role       TEXT    NOT NULL DEFAULT 'kasir'
                     CHECK (role IN ('admin', 'kasir')),
  is_active  INTEGER NOT NULL DEFAULT 1
                     CHECK (is_active IN (0, 1)),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 2. RFID_CARDS
-- 1 user = maksimal 1 kartu aktif (UNIQUE di user_id).
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfid_cards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  -- UID yang dikirim reader saat tap kartu, unik per kartu fisik.
  uid_card   TEXT    NOT NULL UNIQUE,
  is_active  INTEGER NOT NULL DEFAULT 1
                     CHECK (is_active IN (0, 1)),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 3. SHIFTS
-- Sesi kasir per hari. Dibuka saat tap RFID masuk, ditutup saat
-- tap RFID keluar. Semua transaksi terikat ke shift aktif.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  start_time    TEXT    NOT NULL,
  -- NULL selama shift masih open.
  end_time      TEXT,
  opening_cash  REAL    NOT NULL DEFAULT 0,
  -- Diisi kasir saat tutup shift.
  closing_cash  REAL,
  -- Dihitung sistem: opening_cash + total_cash_sales - total_expenses.
  expected_cash REAL,
  note          TEXT,
  status        TEXT    NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'closed')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 4. ATTENDANCE_LOGS
-- Riwayat absensi karyawan. Terpisah dari shifts karena tujuannya
-- beda: shifts untuk rekap keuangan, attendance_logs untuk HR.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  -- FK ke shifts, diisi saat tap masuk membuka shift.
  shift_id   INTEGER REFERENCES shifts(id),
  clock_in   TEXT    NOT NULL,
  -- NULL sampai karyawan tap keluar.
  clock_out  TEXT,
  -- Misal: 'force-closed oleh admin', 'lupa tap keluar'.
  note       TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 5. ACTIVITY_LOGS
-- Audit trail seluruh aksi penting di sistem (polymorphic pattern).
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  -- Nilai valid: 'create' | 'update' | 'delete' | 'void'
  action       TEXT    NOT NULL,
  -- Modul asal aksi: 'product' | 'customer' | 'transaction' | 'promotion' | dst.
  module       TEXT    NOT NULL,
  -- ID record yang diubah di tabel module tersebut. Nullable untuk aksi global.
  reference_id INTEGER,
  description  TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 6. SUPPLIERS
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  phone      TEXT,
  address    TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1
                     CHECK (is_active IN (0, 1)),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 7. CATEGORIES
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 8. PRODUCTS
-- cost_price = HPP terkini, diupdate setiap ada purchase_order
-- baru menggunakan metode last-cost.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id          INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  default_supplier_id  INTEGER REFERENCES suppliers(id)  ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  sku                  TEXT NOT NULL UNIQUE,
  -- Hasil scan barcode dari kemasan produk. Opsional.
  barcode              TEXT UNIQUE,
  description          TEXT,
  -- HPP terkini (last-cost). Update setiap purchase_order received.
  cost_price           REAL NOT NULL DEFAULT 0,
  selling_price        REAL NOT NULL,
  stock_qty            INTEGER NOT NULL DEFAULT 0,
  -- Alert low-stock dipicu saat stock_qty <= min_stock.
  min_stock            INTEGER NOT NULL DEFAULT 5,
  image_path           TEXT,
  is_active            INTEGER NOT NULL DEFAULT 1
                                CHECK (is_active IN (0, 1)),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 9. PURCHASE_ORDERS
-- Event pembelian stok dari supplier. Stok baru NAIK saat status
-- berubah ke 'received', bukan saat PO dibuat (status 'pending').
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id  INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  -- Format: PO-YYYYMMDD-XXXX
  po_number    TEXT    NOT NULL UNIQUE,
  total_amount REAL    NOT NULL,
  -- 'pending': dipesan, belum sampai.
  -- 'received': barang tiba, stok sudah diupdate.
  -- 'cancelled': dibatalkan, stok tidak berubah.
  status       TEXT    NOT NULL DEFAULT 'received'
                       CHECK (status IN ('pending', 'received', 'cancelled')),
  note         TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 10. PURCHASE_ORDER_ITEMS
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        INTEGER NOT NULL REFERENCES products(id),
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  -- Harga beli per unit saat PO ini dibuat. Dipakai update cost_price.
  unit_cost         REAL    NOT NULL CHECK (unit_cost >= 0),
  subtotal          REAL    NOT NULL
);

-- -----------------------------------------------------------------
-- 11. MEMBERSHIP_TIERS
-- Konfigurasi tier loyalty yang bisa diatur admin dari UI.
-- Tanpa tabel ini, aturan tier jadi hardcode di kode.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_tiers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  -- Poin minimum untuk masuk tier ini.
  min_points       INTEGER NOT NULL DEFAULT 0,
  -- Persentase diskon otomatis saat checkout (0 = tidak ada diskon).
  discount_percent REAL    NOT NULL DEFAULT 0
                           CHECK (discount_percent >= 0 AND discount_percent <= 100),
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 12. CUSTOMERS
-- total_points adalah cache denormalized dari point_ledger.
-- Sumber kebenaran tetap di point_ledger (immutable ledger).
-- membership_tier_id di-update otomatis setiap total_points berubah.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  membership_tier_id  INTEGER REFERENCES membership_tiers(id) ON DELETE SET NULL,
  name                TEXT    NOT NULL,
  phone               TEXT    UNIQUE,
  email               TEXT    UNIQUE,
  total_points        INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 13. PROMOTIONS
-- Diskon musiman yang dibuat admin. Bisa berlaku ke semua produk
-- (scope='all_products') atau produk tertentu (scope='specific_product',
-- detail produknya di tabel promotion_products).
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  -- 'percent'      : potongan dalam persen (misal: 10 = 10%)
  -- 'fixed_amount' : potongan nominal tetap (misal: 5000 = Rp5.000)
  type       TEXT NOT NULL CHECK (type IN ('percent', 'fixed_amount')),
  value      REAL NOT NULL CHECK (value > 0),
  -- 'all_products'    : berlaku ke seluruh produk
  -- 'specific_product': berlaku ke produk yang ada di promotion_products
  scope      TEXT NOT NULL CHECK (scope IN ('all_products', 'specific_product')),
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  is_active  INTEGER NOT NULL DEFAULT 1
                     CHECK (is_active IN (0, 1)),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  -- Validasi: tanggal akhir harus setelah tanggal mulai.
  CHECK (end_date >= start_date)
);

-- -----------------------------------------------------------------
-- 14. PROMOTION_PRODUCTS
-- Pivot: produk mana saja yang masuk ke promo specific_product.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotion_products (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
  -- Satu produk tidak boleh duplikat di promo yang sama.
  UNIQUE (promotion_id, product_id)
);

-- -----------------------------------------------------------------
-- 15. TRANSACTIONS
-- Header transaksi penjualan POS.
-- discount_amount = gabungan: diskon promo + diskon tier member.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  shift_id        INTEGER REFERENCES shifts(id),
  promotion_id    INTEGER REFERENCES promotions(id) ON DELETE SET NULL,
  -- Format: INV-YYYYMMDD-XXXX
  invoice_number  TEXT    NOT NULL UNIQUE,
  subtotal        REAL    NOT NULL,
  discount_amount REAL    NOT NULL DEFAULT 0,
  points_redeemed INTEGER NOT NULL DEFAULT 0,
  points_earned   INTEGER NOT NULL DEFAULT 0,
  tax_amount      REAL    NOT NULL DEFAULT 0,
  total_amount    REAL    NOT NULL,
  paid_amount     REAL    NOT NULL,
  change_amount   REAL    NOT NULL DEFAULT 0,
  -- 'cash' | 'qris' | 'transfer'
  payment_method  TEXT    NOT NULL
                          CHECK (payment_method IN ('cash', 'qris', 'transfer')),
  -- 'completed' | 'voided'
  status          TEXT    NOT NULL DEFAULT 'completed'
                          CHECK (status IN ('completed', 'voided')),
  -- Diisi jika transaksi di-void: siapa yang void.
  voided_by       INTEGER REFERENCES users(id),
  void_reason     TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 16. TRANSACTION_ITEMS
-- Detail produk per transaksi. product_name dan unit_price adalah
-- SNAPSHOT saat transaksi terjadi — tidak berubah meski harga produk
-- diupdate di kemudian hari. Ini standar wajib untuk struk akurat.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id   INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id       INTEGER NOT NULL REFERENCES products(id),
  -- Snapshot nama produk saat transaksi. Tidak ikut berubah.
  product_name     TEXT    NOT NULL,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  -- Snapshot harga jual saat transaksi. Tidak ikut berubah.
  unit_price       REAL    NOT NULL,
  discount_per_item REAL   NOT NULL DEFAULT 0,
  subtotal         REAL    NOT NULL
);

-- -----------------------------------------------------------------
-- 17. POINT_LEDGER
-- Immutable ledger riwayat poin customer.
-- Setiap earn/redeem dicatat di sini, tidak langsung edit total_points.
-- Sumber kebenaran poin: SUM ledger ini per customer.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS point_ledger (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id    INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  -- 'earn'  : poin bertambah (dari transaksi atau manual adjustment)
  -- 'redeem': poin dipakai saat checkout
  type           TEXT    NOT NULL CHECK (type IN ('earn', 'redeem')),
  -- Selalu positif. Type menentukan arahnya (earn=tambah, redeem=kurang).
  points         INTEGER NOT NULL CHECK (points > 0),
  note           TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 18. STOCK_MOVEMENTS
-- Audit trail setiap perubahan stok produk dari semua sumber.
-- quantity_change: positif = masuk stok, negatif = keluar stok.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id        INTEGER NOT NULL REFERENCES products(id),
  user_id           INTEGER NOT NULL REFERENCES users(id),
  -- Salah satu harus diisi (kecuali type='adjustment').
  transaction_id    INTEGER REFERENCES transactions(id)     ON DELETE SET NULL,
  purchase_order_id INTEGER REFERENCES purchase_orders(id)  ON DELETE SET NULL,
  -- 'purchase'      : masuk dari purchase_order received
  -- 'sale'          : keluar dari transaksi penjualan
  -- 'adjustment'    : koreksi manual stok oleh admin
  -- 'return'        : produk dikembalikan ke stok
  -- 'void_reversal' : stok dikembalikan akibat transaksi di-void
  type              TEXT    NOT NULL
                            CHECK (type IN ('purchase','sale','adjustment','return','void_reversal')),
  quantity_change   INTEGER NOT NULL,
  stock_before      INTEGER NOT NULL,
  stock_after       INTEGER NOT NULL,
  note              TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------
-- 19. EXPENSES
-- Pengeluaran operasional kasir per shift (plastik, dll).
-- Dipakai untuk hitung expected_cash saat tutup shift.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  shift_id    INTEGER NOT NULL REFERENCES shifts(id),
  description TEXT    NOT NULL,
  amount      REAL    NOT NULL CHECK (amount > 0),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- =================================================================
-- INDEX — Kolom yang sering dipakai di WHERE / JOIN / ORDER BY
-- =================================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_email    ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users (role);

-- rfid_cards
CREATE INDEX IF NOT EXISTS idx_rfid_uid       ON rfid_cards (uid_card);

-- attendance_logs
CREATE INDEX IF NOT EXISTS idx_attendance_user   ON attendance_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shift  ON attendance_logs (shift_id);

-- shifts
CREATE INDEX IF NOT EXISTS idx_shifts_user    ON shifts (user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status  ON shifts (status);

-- activity_logs
CREATE INDEX IF NOT EXISTS idx_actlog_user    ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_actlog_module  ON activity_logs (module, reference_id);

-- products
CREATE INDEX IF NOT EXISTS idx_products_sku       ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode   ON products (barcode);
CREATE INDEX IF NOT EXISTS idx_products_category  ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_active    ON products (is_active);

-- purchase_orders
CREATE INDEX IF NOT EXISTS idx_po_supplier  ON purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status    ON purchase_orders (status);

-- purchase_order_items
CREATE INDEX IF NOT EXISTS idx_poi_order    ON purchase_order_items (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product  ON purchase_order_items (product_id);

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_phone  ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_tier   ON customers (membership_tier_id);

-- promotions
CREATE INDEX IF NOT EXISTS idx_promotions_date    ON promotions (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_active  ON promotions (is_active);

-- transactions
CREATE INDEX IF NOT EXISTS idx_trx_invoice   ON transactions (invoice_number);
CREATE INDEX IF NOT EXISTS idx_trx_user      ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_trx_customer  ON transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_trx_shift     ON transactions (shift_id);
CREATE INDEX IF NOT EXISTS idx_trx_status    ON transactions (status);
CREATE INDEX IF NOT EXISTS idx_trx_date      ON transactions (created_at);

-- transaction_items
CREATE INDEX IF NOT EXISTS idx_trxi_transaction  ON transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_trxi_product      ON transaction_items (product_id);

-- point_ledger
CREATE INDEX IF NOT EXISTS idx_pl_customer  ON point_ledger (customer_id);
CREATE INDEX IF NOT EXISTS idx_pl_type      ON point_ledger (type);

-- stock_movements
CREATE INDEX IF NOT EXISTS idx_sm_product   ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_sm_type      ON stock_movements (type);
CREATE INDEX IF NOT EXISTS idx_sm_date      ON stock_movements (created_at);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_shift  ON expenses (shift_id);

-- =================================================================
-- SEED DATA — Data awal wajib ada sebelum aplikasi bisa dipakai
-- =================================================================

-- Tier membership default (bisa diubah admin dari UI nanti)
INSERT OR IGNORE INTO membership_tiers (id, name, min_points, discount_percent) VALUES
  (1, 'Reguler', 0,    0),
  (2, 'Silver',  500,  3),
  (3, 'Gold',    1500, 5),
  (4, 'Platinum',3000, 10);

-- Kategori produk skincare default
INSERT OR IGNORE INTO categories (id, name, slug) VALUES
  (1, 'Pembersih Wajah',  'pembersih-wajah'),
  (2, 'Toner & Essence',  'toner-essence'),
  (3, 'Serum & Ampoule',  'serum-ampoule'),
  (4, 'Pelembap',         'pelembap'),
  (5, 'Sunscreen',        'sunscreen'),
  (6, 'Masker',           'masker'),
  (7, 'Perawatan Mata',   'perawatan-mata'),
  (8, 'Lainnya',          'lainnya');

-- Admin default — password HARUS diganti pertama kali login.
-- Hash ini adalah bcrypt dari string 'admin123' (cost factor 10).
-- GANTI segera setelah aplikasi pertama dijalankan.
INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES
  (1, 'Administrator', 'admin@skincarepos.local',
   '$2b$10$placeholder.hash.replace.on.first.run.xxxxxxxxxxxxx',
   'admin');
