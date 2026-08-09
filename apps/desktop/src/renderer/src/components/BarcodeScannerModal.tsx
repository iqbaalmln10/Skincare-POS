import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import "./BarcodeScannerModal.css";

interface BarcodeScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

// Scan barcode pakai kamera bawaan laptop — cukup untuk fase development
// sesuai permintaan Iqbal (belum pakai hardware scanner USB terpisah).
// ZXing terus-menerus decode frame video sampai ketemu barcode 1D valid
// (EAN-13/UPC, umum di kemasan skincare), lalu otomatis menutup modal.
export default function BarcodeScannerModal({ onDetected, onClose }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, err, controls) => {
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
        <p className="scanner-hint">Arahkan barcode kemasan produk ke kamera.</p>

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
