import fs from "fs";
import path from "path";
import { app } from "electron";
import { THERMAL_LOGO_BASE64 } from "./thermal-logo";

const DEFAULT_BAUD_RATE = 9600;

// Kertas 58mm = 32 karakter per baris di font A (konfirmasi spek printer:
// EPPOS EP58SBL/RPP02, 58mm). Dipakai buat DUA hal: (1) width option di
// Printer constructor supaya library-nya tahu lebar aktual, (2) word-wrap
// manual di bawah — lihat catatan panjang di wrapText() soal kenapa ini
// yang jadi akar masalah teks tidak center.
const PAPER_WIDTH_CHARS = 32;

interface PrinterSettings {
  comPort: string | null;
}

function settingsPath(): string {
  return path.join(app.getPath("userData"), "printer-settings.json");
}

export function getPrinterSettings(): PrinterSettings {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), "utf-8"));
  } catch {
    return { comPort: null };
  }
}

export function savePrinterSettings(comPort: string): PrinterSettings {
  const settings = { comPort };
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf-8");
  return settings;
}

export interface PrinterPortInfo {
  path: string;
  manufacturer?: string;
  isLikelyBluetooth: boolean;
}

export async function listPrinterPorts(): Promise<PrinterPortInfo[]> {
  const { SerialPort } = await import("serialport");
  const ports = await SerialPort.list();
  return ports.map((p) => ({
    path: p.path,
    manufacturer: p.manufacturer,
    isLikelyBluetooth: (p.pnpId || "").toUpperCase().includes("BTHENUM"),
  }));
}

async function createPrinter(portName: string) {
  let escposModule: typeof import("@node-escpos/core");
  let SerialportAdapterCtor: typeof import("@node-escpos/serialport-adapter").default;

  try {
    escposModule = await import("@node-escpos/core");
    SerialportAdapterCtor = (await import("@node-escpos/serialport-adapter")).default;
  } catch (error: any) {
    throw new Error(`Printer tidak tersedia: ${error.message}`);
  }

  const SerialportAdapter = SerialportAdapterCtor as unknown as new (port: string, options: any) => any;
  const escpos = escposModule as unknown as {
    Printer: new (adapter: any, options: any) => any;
    Image: { load: (url: string) => Promise<any> };
  };

  const device = new SerialportAdapter(portName, { baudRate: DEFAULT_BAUD_RATE });
  // `width` WAJIB di-set eksplisit ke 32 (58mm) — ini akar masalah teks
  // tidak center di laporan sebelumnya. Kalau dibiarkan default (options
  // kosong), library-nya fallback ke width 48 (asumsi kertas 80mm), yang
  // dipakai internal buat helper seperti drawLine()/tableCustom(). Method
  // .text() sendiri sebenarnya pure pass-through (tidak baca width), TAPI
  // supaya semua helper library konsisten dan behaviour-nya predictable di
  // masa depan, tetap kita set eksplisit sesuai spek fisik printer.
  const printer = new escpos.Printer(device, { width: PAPER_WIDTH_CHARS });
  return { device, printer, escpos };
}

/**
 * Word-wrap manual ke lebar kertas, SEBELUM teks dikirim ke printer.
 *
 * INI AKAR MASALAH TEKS TIDAK CENTER di laporan sebelumnya: kode lama
 * ngirim satu baris utuh (mis. alamat toko "Jl. Melati No. 12, Jember,
 * Jawa Timur" — 38 karakter) dalam SATU panggilan .text(), padahal kertas
 * 58mm cuma muat 32 karakter per baris. Printer fisik jadi auto-wrap
 * sendiri di tengah kalimat, TAPI baris hasil wrap otomatis itu TIDAK
 * ikut center — cuma lanjut nge-print dari posisi cursor apa adanya.
 * Makanya kalimat awal kelihatan center, tapi sisa kata yang kepotong
 * ("Timur") nongol rata kiri/acak, persis yang dilaporkan.
 *
 * Fix-nya: kita yang word-wrap manual jadi baris-baris pendek (≤32 char,
 * tidak motong di tengah kata), lalu kirim TIAP baris sebagai .text()
 * terpisah — supaya command align yang sedang aktif diterapkan ulang ke
 * setiap baris, bukan cuma baris pertama.
 */
function wrapText(text: string, maxWidth = PAPER_WIDTH_CHARS): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxWidth) {
      if (current) lines.push(current);
      // Kata tunggal yang lebih panjang dari lebar kertas (jarang, tapi
      // jaga-jaga) — potong paksa daripada bikin infinite loop.
      current = word.length > maxWidth ? word.slice(0, maxWidth) : word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function printWrapped(printer: any, text: string, maxWidth = PAPER_WIDTH_CHARS) {
  wrapText(text, maxWidth).forEach((line) => printer.text(line));
}

export async function printReceiptToSerial(receipt: {
  storeName: string;
  address: string;
  phone: string;
  transactionId: string;
  timestamp: string;
  cashierName: string;
  customer: string;
  paymentMethod: string;
  items: Array<{ name: string; qty: number; price: number }>;
  subtotal: number;
  discountAmount: number;
  total: number;
  change: number;
  footerNote: string;
  showLogo?: boolean;
}) {
  const settings = getPrinterSettings();
  if (!settings.comPort) {
    throw new Error("Belum ada COM port printer yang dipilih. Atur dulu di Pengaturan Printer.");
  }
  const portName = settings.comPort;

  const { device, printer, escpos } = await createPrinter(portName);

  return new Promise<void>((resolve, reject) => {
    device.open(async (err?: Error | null) => {
      if (err) {
        reject(new Error(`Gagal membuka printer di ${portName}: ${err.message}`));
        return;
      }

      try {
        printer.align("ct");

        if (receipt.showLogo !== false) {
          try {
            const logoImage = await escpos.Image.load(THERMAL_LOGO_BASE64);
            await printer.image(logoImage, "d24");
          } catch (logoErr) {
            // Logo gagal dicetak (mis. printer tidak support raster image di
            // firmware-nya) TIDAK BOLEH menggagalkan seluruh struk — teks
            // tetap harus tercetak. Kita telan errornya, bukan reject().
            console.error("[printer] Gagal cetak logo, lanjut tanpa logo:", logoErr);
          }
        }

        printer.style("b").size(1, 1);
        printWrapped(printer, receipt.storeName);
        printer.style("normal").size(0, 0);
        printWrapped(printer, receipt.address);
        printWrapped(printer, `Telp. ${receipt.phone}`);
        printer.text("-".repeat(PAPER_WIDTH_CHARS));

        printer.align("lt");
        printer.text(`No. ${receipt.transactionId}`);
        printer.text(receipt.timestamp);
        printer.text(`Kasir: ${receipt.cashierName}`);
        printWrapped(printer, `Pelanggan: ${receipt.customer}`);
        printer.text(`Metode: ${receipt.paymentMethod}`);
        printer.text("-".repeat(PAPER_WIDTH_CHARS));

        receipt.items.forEach((item) => {
          printWrapped(printer, item.name);
          printer.text(
            `${item.qty} x ${item.price.toLocaleString("id-ID")} = ${(item.qty * item.price).toLocaleString("id-ID")}`
          );
        });

        printer
          .text("-".repeat(PAPER_WIDTH_CHARS))
          .text(`Subtotal: ${receipt.subtotal.toLocaleString("id-ID")}`)
          .text(`Diskon: ${receipt.discountAmount.toLocaleString("id-ID")}`)
          .text(`Total: ${receipt.total.toLocaleString("id-ID")}`)
          .text(`Kembalian: ${receipt.change.toLocaleString("id-ID")}`)
          .text("-".repeat(PAPER_WIDTH_CHARS));

        printer.align("ct");
        printWrapped(printer, receipt.footerNote);
        printer.text("*** Terima Kasih ***");

        await printer.feed(2).cut().close();
        resolve();
      } catch (printErr: any) {
        reject(new Error(`Gagal mengirim data ke printer: ${printErr.message}`));
      }
    });
  });
}
