import { db } from "../db/connection";

export interface MembershipTierRow {
  id: number;
  name: string;
  min_points: number;
  discount_percent: number;
}

export interface MembershipTierDTO {
  id: number;
  name: string;
  minPoints: number;
  discountPercent: number;
}

function toDTO(row: MembershipTierRow): MembershipTierDTO {
  return {
    id: row.id,
    name: row.name,
    minPoints: row.min_points,
    discountPercent: row.discount_percent,
  };
}

export function listMembershipTiers(): MembershipTierDTO[] {
  const rows = db
    .prepare("SELECT * FROM membership_tiers ORDER BY min_points ASC")
    .all() as MembershipTierRow[];
  return rows.map(toDTO);
}

// Tier awal untuk customer baru (0 poin) — selalu tier dengan min_points terendah.
// Dipakai customer.service saat createCustomer, BUKAN dipilih manual oleh admin.
export function getLowestTier(): MembershipTierDTO | null {
  const row = db
    .prepare("SELECT * FROM membership_tiers ORDER BY min_points ASC LIMIT 1")
    .get() as MembershipTierRow | undefined;
  return row ? toDTO(row) : null;
}

// Dipakai nanti oleh modul Sales/loyalty setiap total_points customer berubah,
// supaya membership_tier_id ikut ter-update otomatis (sesuai desain schema).
export function getTierForPoints(points: number): MembershipTierDTO | null {
  const row = db
    .prepare("SELECT * FROM membership_tiers WHERE min_points <= ? ORDER BY min_points DESC LIMIT 1")
    .get(points) as MembershipTierRow | undefined;
  return row ? toDTO(row) : null;
}
