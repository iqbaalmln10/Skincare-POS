// Logo toko versi kecil khusus buat cetak thermal (58mm), sudah di-resize dari
// src/renderer/src/assets/logo.png (1440x1438 -> 200x199).
//
// PENTING soal kenapa versi sebelumnya tidak tampil pas dicetak: versi lama
// cuma resize + flatten background ke putih, lalu MENGANDALKAN threshold
// otomatis dari library escpos (RGB2Gray: luminance < 128 = hitam) saat
// proses cetak. Karena logo aslinya dominan warna pastel (pink muda, coklat
// muda) yang luminance-nya di ATAS 128, hampir semua pixel ke-threshold jadi
// PUTIH (tidak dicetak) — cuma sisa outline paling gelap yang lolos jadi
// titik-titik kecil acak di struk, persis kayak yang dilaporkan.
//
// Fix-nya: gambar ini SUDAH di-convert duluan (offline, bukan saat runtime)
// jadi hitam-putih murni 1-bit dengan Floyd-Steinberg dithering + boost
// kontras, supaya bentuk logonya (siluet karakter + tulisan "By Me") tetap
// jelas kebaca meski di-threshold ulang oleh printer. Karena sudah pure
// hitam/putih, threshold di RGB2Gray saat print jadi pass-through apa
// adanya, tidak akan menghilangkan detail lagi.
//
// Kalau logo toko diganti nanti: timpa src/renderer/src/assets/logo.png,
// lalu generate ulang constant ini dengan resize ke lebar ~200px, grayscale,
// boost kontras, dan convert ke mode 1-bit dengan dithering (di Python/PIL:
// ImageOps.autocontrast + ImageEnhance.Contrast + .convert("1")) — jangan
// cuma resize+flatten putih seperti sebelumnya, karena threshold otomatis
// library escpos tidak cukup kuat buat logo berwarna pastel/terang.
export const THERMAL_LOGO_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADHAQAAAAB0dSHmAAADYklEQVR4nO2XTYgcRRTHf9UzPTO7O8u0sOAeFrfVBTeIiR68BbcPwRxEWBQ0ip85SC4ehUgkW5EccoyXIHhZIrl4kOhFQSWt4EFB8CIGT2VAXQJi5ct0dtt6Hvpjpmsm4MVb16V75sd79X//qveGUcJdVnA30JKWtKQlLfn/yZVrkYekWI64I42lykl+Z4ByM7PtgDftK7IN6Jmk+a2vOp1FZvyilMQBGHdkEhXiM4AVGI3rKchfGSEMQI1JmS2j9zuAaC/bH5b5FxnSY9WLGYLaY5c5bT1tA4scAUhmVboPBWQecaAe1wCDv3XpRReAHshuIXJBvX0on8hm9N6NNIe0j2RuIkbWDwXnAYiue+6khG9e7NDlCcjUhDtiCD+63AElqLwz6Q4o9Q4AGobNera+WX4FJKlr7VYvvR15hHDvxxiiJgleu/Uc858cBuIGUWc25pIU8kjyhm+ROrc0pyF2ta1VzOKnz4aFcRwfNbTd83R2KwFkvHH5TH5IVVq+60l3bPDCZyphZMiJGzeE+7MPJQFUgGpWurtyeP0kIGCa5K214VkApaqty4f9eO3SOcCM70Wt7acPngLSbt0v1Wl//d4Db2xyTQ/qDUqSfpekty8Dj9ZXriTx4iXzvgVSGDSz3Xh5//cWVmsBdbYOi9vLSgyn44hJd1h48sETZzsioszqZGdJ0vv12zvH+iKC2WgQ1KZkFzdEXE3KfbQcUMPNxxSq7pTqtPkKhyUez4yyYAs4DKBPuUZMwpXKQN9RFJCyQxw0SQwarVlnedgkEcBvENO3TTIghl8KJf4+AJp4PLVqUmgyvFtfxcKKXUSzCht5PY3LmKtQjL+8V5lQkqXXSyN2Omw3SP9o8TQm156CFcBBQq9SXpEYTRZh0mE1lGqNBA6L0f3pSh15BETkPgnBMiLz7huQwzqWrIqpKhYJYZn7uJeFZs+B00RYbk9lEwcxMddZ8ojqJlgMcGxGzBoRBJ/72gJIsKiHvpyqNMagkJOBTwbluf78j1eP6xh1kJGG0KvHdSM5SIbfwZDnKCBhyh2rbGDpGHjYy2Zl4CwuYvoU6IaFwuN+Nrb2ZeBQB7xsw5CXusyfYm7Tr+f8lsgzF+TqBWn0toh8ISJ/vio3ny8/q/Y/YEta0pKWtOQ/kX8BQBj27PdFFIUAAAAASUVORK5CYII=";