// Kompresi gambar produk di sisi client sebelum disimpan sebagai base64 data
// URL langsung di kolom products.image_path (SQLite TEXT, tanpa limit
// panjang praktis). Ini pendekatan pragmatis untuk fase development —
// TIDAK dipakai untuk production karena ukuran DB jadi ikut membengkak.
// Kalau nanti mau naik ke production, ganti ke penyimpanan file lewat IPC
// (renderer -> main process tulis ke userData dir) dan simpan path relatif
// di kolom ini, bukan data URL-nya langsung.
const MAX_DIMENSION = 480;
const JPEG_QUALITY = 0.8;

export function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > height && width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Gagal memproses gambar"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("File bukan gambar yang valid"));
    };

    img.src = objectUrl;
  });
}
