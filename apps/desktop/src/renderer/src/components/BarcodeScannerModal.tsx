import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import "./BarcodeScannerModal.css";

interface BarcodeScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

// PENTING: reader versi sebelumnya dibuat TANPA hints sama sekali
// (`new BrowserMultiFormatReader()`), itu sebabnya barcode garis (1D —
// EAN-13/UPC/CODE-128, yang umum di kemasan skincare) susah/nyaris tidak
// pernah kebaca lewat kamera laptop, sedangkan barcode kotak (QR/2D) tetap
// mulus. QR memang jauh lebih toleran terhadap blur, sudut, dan resolusi
// rendah karena punya finder pattern + error correction, sementara barcode
// 1D butuh scan line yang tegak lurus & tajam melewati semua bar-nya.
// Fix: kasih hints eksplisit (TRY_HARDER + daftar format 1D yang relevan)
// supaya decoder benar-benar mengusahakan deteksi 1D, bukan cuma
// kebetulan nemu yang paling gampang (QR).
const hints = new Map();
hints.set(DecodeHintType.TRY_HARDER, true);
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
]);

// Resolusi kamera dinaikkan ke 1280x720 (ideal) — default getUserMedia
// browser sering cuma ~640x480, cukup untuk QR tapi bar-bar tipis di
// barcode 1D jadi gampang "menyatu"/blur dari jarak normal pegang
// kemasan produk. Pakai "ideal" (bukan "exact") supaya tetap fallback
// aman kalau webcam laptop tidak mendukung resolusi setinggi itu.
const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

// Scan barcode pakai kamera bawaan laptop — cukup untuk fase development
// sesuai permintaan Iqbal (belum pakai hardware scanner USB terpisah).
// ZXing terus-menerus decode frame video sampai ketemu barcode valid
// (1D maupun QR, umum di kemasan skincare), lalu otomatis menutup modal.
export default function BarcodeScannerModal({ onDetected, onClose }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;
    let cancelled = false;

    reader
      .decodeFromConstraints(VIDEO_CONSTRAINTS, videoRef.current!, (result, err, controls) => {
        if (cancelled) return;
        controlsRef.current = controls;
        if (result) {
          controls.stop();
          onDetected(result.getText());
        }
        // NotFoundException dilempar terus tiap frame kosong — bukan error
        // sungguhan, cuma berarti "belum ketemu barcode di frame ini", jadi
        // sengaja diabaikan supaya tidak spam pesan error ke user.
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(
          err?.name === "NotAllowedError"
            ? "Akses kamera ditolak. Izinkan akses kamera di pengaturan browser/OS lalu coba lagi."
            : "Tidak bisa mengakses kamera. Pastikan laptop punya kamera dan tidak dipakai aplikasi lain."
        );
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card scanner-card" onClick={(e) => e.stopPropagation()}>
        <h3>Scan Barcode Produk</h3>
        <p className="scanner-hint">
          Arahkan barcode kemasan produk ke kamera. Untuk barcode garis, jaga jarak ±10–15cm,
          pastikan garis-garisnya tidak buram, dan pencahayaan cukup terang.
        </p>

        <div className="scanner-viewport">
          <video ref={videoRef} muted playsInline />
          <div className="scanner-frame" />
        </div>

        {error && <div className="scanner-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
