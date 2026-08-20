// Wrapper cross-platform buat `npm run package`. Ada beberapa langkah manual
// di sini yang TIDAK bisa cuma diserahkan ke electron-builder polos, semua
// gara-gara project ini pakai npm workspaces (root punya banyak app/package,
// dependency di-hoist ke node_modules paling atas) — electron-builder banyak
// asumsi struktur project standalone/non-monorepo, jadi beberapa hal harus
// dikerjakan manual dulu supaya hasil packaging-nya benar.

const { execFileSync } = require("child_process");
const path = require("path");

const desktopDir = path.join(__dirname, "..");
const backendDir = path.join(desktopDir, "..", "backend");

function run(cmd, args, cwd) {
  console.log(`\n[package] > ${cmd} ${args.join(" ")}  (cwd: ${path.relative(desktopDir, cwd) || "."})`);
  execFileSync(cmd, args, { stdio: "inherit", shell: true, cwd });
}

// -----------------------------------------------------------------
// 1. Install dependency backend secara TERISOLASI (bukan hoisted ke root).
//    extraResources di package.json nanti nge-copy apps/backend/node_modules
//    apa adanya ke dalam installer — kalau dependency-nya cuma ke-hoist di
//    root (perilaku normal npm workspaces), folder ini tidak akan ada sama
//    sekali dan packaging gagal ("file source doesn't exist").
//    --no-workspaces MEMAKSA npm install versi standalone di folder ini,
//    --omit=dev supaya devDependencies backend (tsx, dst) tidak ikut kebawa.
// -----------------------------------------------------------------
run("npm", ["install", "--omit=dev", "--no-workspaces", "--ignore-scripts"], backendDir);

// -----------------------------------------------------------------
// 2. Rebuild native module MILIK BACKEND (better-sqlite3, bcrypt) supaya
//    kompatibel dengan Electron — backend jalan sebagai child process hasil
//    fork() dari proses utama Electron (lihat src/main/index.ts), yang
//    berarti backend ikut dikirim lewat runtime Node bawaan Electron, BUKAN
//    Node biasa. ABI-nya beda, native module yang di-compile buat Node biasa
//    TIDAK akan jalan (akan crash begitu backend coba buka database/login).
//    Baru bisa dijalankan SEKARANG (bukan di postinstall biasa) karena
//    apps/backend/node_modules baru ada setelah langkah 1 di atas.
// -----------------------------------------------------------------
run(
  "npx",
  ["electron-rebuild", "-f", "-w", "better-sqlite3,bcrypt", "--module-dir", backendDir],
  desktopDir
);

// -----------------------------------------------------------------
// 3. Build ulang backend (tsc + copy migration .sql) — dilakukan di sini
//    (bukan cuma di `npm run build`) supaya urutannya pasti: install dulu
//    baru compile, jaga-jaga kalau ada dependency baru yang perlu ke-resolve
//    tsc.
// -----------------------------------------------------------------
run("npm", ["run", "build"], backendDir);

// -----------------------------------------------------------------
// 4. Deteksi versi Electron lewat require.resolve() (yang jalan-jalan ke atas
//    node_modules dengan benar, beda dari electron-builder yang cuma cek
//    langsung di apps/desktop/node_modules/electron dan gagal di workspace
//    manapun dengan pesan "Cannot compute electron version").
// -----------------------------------------------------------------
const electronVersion = require(require.resolve("electron/package.json", { paths: [desktopDir] })).version;
console.log(`\n[package] Terdeteksi Electron v${electronVersion}`);

// -----------------------------------------------------------------
// 5. Baru sekarang panggil electron-builder beneran, dengan versi Electron
//    dioper eksplisit + argumen tambahan (mis. --dir buat testing) diteruskan.
// -----------------------------------------------------------------
run("electron-builder", [`--config.electronVersion=${electronVersion}`, ...process.argv.slice(2)], desktopDir);

console.log("\n[package] Selesai.");
