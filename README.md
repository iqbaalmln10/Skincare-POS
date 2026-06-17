# Skincare POS

Aplikasi kasir desktop untuk toko skincare. Electron + React (frontend) dengan Express + SQLite (backend embedded).

## Struktur Project

```
apps/
  desktop/   → Electron + React + TypeScript (UI dan shell aplikasi)
  backend/   → Express + TypeScript + SQLite (logic bisnis dan database)
packages/
  shared/    → Tipe TypeScript yang dipakai bersama frontend & backend
```

## Setup Awal (Sekali Saja)

Jalankan dari root project:

```bash
npm install
npm run build:shared
```

## Menjalankan saat Development

Buka **dua terminal**:

Terminal 1 — jalankan backend:
```bash
npm run dev:backend
```

Terminal 2 — jalankan desktop app:
```bash
npm run dev:desktop
```

Window Electron akan terbuka otomatis. Backend berjalan di `http://localhost:4000`.

## Build untuk Produksi (Installer .exe)

```bash
npm run build:shared
npm run build:backend
npm run package --workspace=apps/desktop
```

Installer akan ada di `apps/desktop/dist/`.

## Catatan Penting untuk Tim

- Setiap perubahan schema database **wajib** diikuti update tipe di `packages/shared/src/index.ts`.
- Backend berjalan standalone saat development (`npm run dev:backend`), tapi saat production di-bundle dan dijalankan otomatis oleh Electron sebagai child process — user akhir tidak perlu menjalankan apapun secara manual selain membuka aplikasi.
- Database SQLite tersimpan di file lokal. Saat production, lokasinya di folder userData OS (lihat `apps/desktop/src/main/index.ts`), bukan di folder project.
- Jalankan Electron di **Windows** (atau WSLg jika sudah dikonfigurasi) — WSL murni tanpa display server tidak bisa render window Electron.

## Dokumen Pendukung

- Schema database: lihat file `kasir_skincare_v2.dbml` (paste ke dbdiagram.io untuk visualisasi)
