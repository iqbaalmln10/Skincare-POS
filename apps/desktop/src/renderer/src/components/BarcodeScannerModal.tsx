import { useEffect, useRef, useState } from "react";
import { BarcodeFormat, BrowserMultiFormatReader } from "@zxing/browser";
import "./BarcodeScannerModal.css";

interface BarcodeScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerModal({ onDetected, onClose }: BarcodeScannerModalProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasDetectedRef = useRef(false);

  useEffect(() => {
    hasDetectedRef.current = false;
    setError(null);

    const codeReader = new BrowserMultiFormatReader();
    let stopped = false;

    const startScanner = async () => {
      try {
        if (!videoRef.current) return;

        const controls = await codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (stopped) return;

          if (result) {
            const code = result.getText();
            if (!code || hasDetectedRef.current) return;
            hasDetectedRef.current = true;
            onDetected(code);
          }

          if (err && err.name !== "NotFoundException") {
            setError("Gagal membaca barcode dari kamera. Coba arahkan perangkat kamera dengan pencahayaan yang cukup.");
          }
        });

        controlsRef.current = controls;
      } catch (cameraError) {
        const message = cameraError instanceof Error ? cameraError.message : String(cameraError);
        setError(
          /permission|denied|not allowed/i.test(message)
            ? "Akses kamera ditolak. Izinkan akses kamera di pengaturan browser/OS lalu coba lagi."
            : "Tidak bisa mengakses kamera. Pastikan laptop punya kamera dan tidak dipakai aplikasi lain."
        );
      }
    };

    void startScanner();

    return () => {
      stopped = true;
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card scanner-card" onClick={(e) => e.stopPropagation()}>
        <h3>Scan Barcode Produk</h3>
        <p className="scanner-hint">
          Arahkan barcode garis kemasan produk ke kamera. Jaga jarak ±10–15cm, pastikan
          garis-garisnya tidak buram, dan pencahayaan cukup terang.
        </p>

        <div className="scanner-viewport" ref={viewportRef}>
          <video ref={videoRef} className="scanner-video" muted playsInline autoPlay />
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
