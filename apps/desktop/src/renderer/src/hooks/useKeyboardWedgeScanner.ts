import { useEffect, useRef } from "react";

interface UseKeyboardWedgeScannerOptions {
  /** Dipanggil begitu satu scan lengkap terdeteksi (setelah tombol Enter). */
  onScan: (code: string) => void;
  /** Nyalakan/matikan listener tanpa perlu unmount komponen. Default true. */
  enabled?: boolean;
  /** Jarak maksimum antar keystroke (ms) supaya masih dianggap 1 scan yang
   *  sama. Scanner hardware "mengetik" jauh lebih cepat dari manusia — di
   *  bawah 50ms antar karakter itu praktis mustahil dicapai lewat mengetik
   *  manual, jadi aman dipakai sebagai pembeda. Default 50.
   */
  maxIntervalMs?: number;
  /** Panjang kode minimum supaya tidak salah tangkap ketukan tunggal yang
   *  kebetulan cepat. Default 4.
   */
  minLength?: number;
}

/**
 * Barcode scanner USB tipe keyboard-wedge (mis. iWare handheld scanner)
 * bekerja dengan cara "mengetik" hasil scan ke elemen yang sedang fokus,
 * diakhiri Enter — persis seperti mengetik cepat di keyboard biasa. Hook
 * ini pasang listener keydown di level document (fase capture) supaya
 * scan tetap tertangkap MESKIPUN sedang tidak ada input field yang fokus,
 * dan meng-cegah karakter scan ke-2 dst supaya tidak nyasar ketik ke field
 * lain yang kebetulan sedang fokus.
 *
 * Trade-off yang disengaja (bukan kelalaian): karakter PERTAMA dari sebuah
 * scan tetap bisa lolos ke field yang sedang fokus SEBELUM pola "ketikan
 * cepat" ini kebaca oleh hook (butuh minimal 2 karakter buat membedakan
 * scan vs ketikan manusia biasa). Praktiknya nyaris tidak masalah karena:
 * (a) alur normal, field yang relevan (barcode / halaman POS) memang jadi
 * fokus utama saat user niat scan, (b) kalaupun ada 1 digit nyasar, user
 * gampang lihat & hapus manual. Mengatasi 100% termasuk karakter pertama
 * butuh delay buffering tambahan yang bikin UX ketikan manusia jadi lag —
 * trade-off ini dianggap tidak sepadan untuk kasus pakai POS.
 */
export function useKeyboardWedgeScanner({
  onScan,
  enabled = true,
  maxIntervalMs = 50,
  minLength = 4,
}: UseKeyboardWedgeScannerOptions) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan; // selalu pakai versi terbaru tanpa perlu re-attach listener

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      const gap = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        const code = bufferRef.current;
        bufferRef.current = "";
        if (code.length >= minLength) {
          // Ini yang mencegah Enter dari scan submit form / trigger tombol
          // lain secara tidak sengaja di field yang sedang fokus.
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(code);
        }
        return;
      }

      // Karakter tunggal biasa (bukan Shift/Ctrl/Tab/dll) dan jaraknya dari
      // ketukan sebelumnya cukup cepat -> kemungkinan besar bagian dari scan
      // yang sedang berlangsung, bukan ketikan manusia. Tahan karakter ini
      // supaya tidak nyasar ke field lain.
      if (e.key.length === 1) {
        if (gap <= maxIntervalMs) {
          bufferRef.current += e.key;
          e.preventDefault();
          e.stopPropagation();
        } else {
          // Jeda kepanjangan -> mulai buffer baru dari karakter ini (bisa
          // jadi ini awal scan baru, bisa juga cuma ketikan manusia biasa;
          // baru ketahuan salah satu begitu Enter datang atau jeda berikutnya).
          bufferRef.current = e.key;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled, maxIntervalMs, minLength]);
}
