import { db } from "../db/connection";

export interface LoyaltySettingsDTO {
  pointsPerAmount: number;
  updatedAt: string;
}

const MIN_POINTS_PER_AMOUNT = 1000;
const MAX_POINTS_PER_AMOUNT = 100000;

function toDTO(row: { points_per_amount: number; updated_at: string }): LoyaltySettingsDTO {
  return { pointsPerAmount: row.points_per_amount, updatedAt: row.updated_at };
}

export function getLoyaltySettings(): LoyaltySettingsDTO {
  const row = db
    .prepare("SELECT points_per_amount, updated_at FROM loyalty_settings WHERE id = 1")
    .get() as { points_per_amount: number; updated_at: string };
  return toDTO(row);
}

export function updateLoyaltySettings(pointsPerAmount: number): LoyaltySettingsDTO {
  if (!Number.isFinite(pointsPerAmount) || !Number.isInteger(pointsPerAmount)) {
    throw new Error("Nilai harus berupa angka bulat");
  }
  if (pointsPerAmount < MIN_POINTS_PER_AMOUNT || pointsPerAmount > MAX_POINTS_PER_AMOUNT) {
    throw new Error(
      `Nilai harus antara Rp${MIN_POINTS_PER_AMOUNT.toLocaleString("id-ID")} - Rp${MAX_POINTS_PER_AMOUNT.toLocaleString("id-ID")} per 1 poin`
    );
  }

  db.prepare(
    "UPDATE loyalty_settings SET points_per_amount = ?, updated_at = datetime('now') WHERE id = 1"
  ).run(pointsPerAmount);

  return getLoyaltySettings();
}
