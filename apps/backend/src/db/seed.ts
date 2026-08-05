import bcrypt from "bcrypt";
import { db, initDatabase } from "./connection";

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: "admin" | "kasir";
  phone?: string | null;
  rfidUid?: string | null; // opsional: langsung pasangkan kartu RFID (uid bebas untuk testing)
}

// 👉 Edit / tambah akun di sini sesuai kebutuhan kamu
const usersToSeed: SeedUser[] = [
  {
    name: "Administrator",
    email: "admin@skincarepos.local",
    password: "admin123",
    role: "admin",
    rfidUid: null,
  },
  {
    name: "Sarah Miller",
    email: "`sarah@skincarepos.local`",
    password: "kasir123",
    role: "kasir",
    rfidUid: "RFID-0001", // uid bebas, dipakai buat simulasi tap kartu
  },
];

function seed() {
  initDatabase(); // pastikan migration sudah jalan dulu

  for (const u of usersToSeed) {
    const hash = bcrypt.hashSync(u.password, 10);
    const now = new Date().toISOString();

    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(u.email) as { id: number } | undefined;

    let userId: number;

    if (existing) {
      db.prepare(
        `UPDATE users SET name=?, password=?, phone=?, role=?, is_active=1, updated_at=? WHERE id=?`
      ).run(u.name, hash, u.phone ?? null, u.role, now, existing.id);
      userId = existing.id;
      console.log(`[seed] User diupdate: ${u.email}`);
    } else {
      const result = db
        .prepare(
          `INSERT INTO users (name, email, password, phone, role, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
        )
        .run(u.name, u.email, hash, u.phone ?? null, u.role, now, now);
      userId = Number(result.lastInsertRowid);
      console.log(`[seed] User dibuat: ${u.email} (id=${userId})`);
    }

    if (u.rfidUid) {
      const existingCard = db
        .prepare("SELECT id FROM rfid_cards WHERE user_id = ?")
        .get(userId) as { id: number } | undefined;

      if (existingCard) {
        db.prepare("UPDATE rfid_cards SET uid_card=?, is_active=1 WHERE id=?").run(
          u.rfidUid,
          existingCard.id
        );
      } else {
        db.prepare(
          "INSERT INTO rfid_cards (user_id, uid_card, is_active, created_at) VALUES (?, ?, 1, ?)"
        ).run(userId, u.rfidUid, now);
      }
      console.log(`[seed] Kartu RFID terpasang: ${u.rfidUid} → ${u.email}`);
    }
  }

  console.log("[seed] Selesai.");
}

seed();