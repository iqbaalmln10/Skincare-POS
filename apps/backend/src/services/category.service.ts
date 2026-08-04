import { db } from "../db/connection";

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function listCategories(): CategoryRow[] {
  return db.prepare("SELECT id, name, slug FROM categories ORDER BY name ASC").all() as CategoryRow[];
}

export function createCategory(name: string): CategoryRow {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Nama kategori wajib diisi");
  }

  const slug = slugify(trimmed);

  const existing = db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug);
  if (existing) {
    throw new Error("Kategori dengan nama ini sudah ada");
  }

  const result = db
    .prepare("INSERT INTO categories (name, slug) VALUES (?, ?)")
    .run(trimmed, slug);

  return { id: Number(result.lastInsertRowid), name: trimmed, slug };
}
