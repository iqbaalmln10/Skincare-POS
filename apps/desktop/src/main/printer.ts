import fs from "fs";
import path from "path";
import { app } from "electron";

const DEFAULT_BAUD_RATE = 9600;

// COM port disimpan di userData (BUKAN hardcode "COM6") karena ini murni
// pengaturan hardware lokal per-komputer — kalau nanti app ini dipasang di
// beberapa komputer kasir, tiap komputer bisa dapat nomor COM Bluetooth yang
// beda tergantung urutan pairing di OS masing-masing.
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
    // Port hasil pairing Bluetooth biasanya pnpId-nya mengandung "BTHENUM"
    // (Bluetooth Enumerator) — dipakai buat nandain di dropdown pemilihan port.
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
  const escpos = escposModule as unknown as { Printer: new (adapter: any, options: any) => any };

  const device = new SerialportAdapter(portName, { baudRate: DEFAULT_BAUD_RATE });
  const printer = new escpos.Printer(device, {} as any);
  return { device, printer };
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
}) {
  const settings = getPrinterSettings();
  if (!settings.comPort) {
    throw new Error("Belum ada COM port printer yang dipilih. Atur dulu di Pengaturan Printer.");
  }
  const portName = settings.comPort;

  const { device, printer } = await createPrinter(portName);

  return new Promise<void>((resolve, reject) => {
    device.open((err?: Error | null) => {
      if (err) {
        reject(new Error(`Gagal membuka printer di ${portName}: ${err.message}`));
        return;
      }

      printer
        .font("a")
        .align("ct")
        .style("b")
        .size(1, 1)
        .text(receipt.storeName)
        .text(receipt.address)
        .text(`Telp. ${receipt.phone}`)
        .text("-".repeat(32))
        .align("lt")
        .style("normal")
        .size(0, 0)
        .text(`No. ${receipt.transactionId}`)
        .text(receipt.timestamp)
        .text(`Kasir: ${receipt.cashierName}`)
        .text(`Pelanggan: ${receipt.customer}`)
        .text(`Metode: ${receipt.paymentMethod}`)
        .text("-".repeat(32));

      receipt.items.forEach((item) => {
        printer.text(`${item.name}`);
        printer.text(`${item.qty} x ${item.price.toLocaleString("id-ID")} = ${(item.qty * item.price).toLocaleString("id-ID")}`);
      });

      printer
        .text("-".repeat(32))
        .text(`Subtotal: ${receipt.subtotal.toLocaleString("id-ID")}`)
        .text(`Diskon: ${receipt.discountAmount.toLocaleString("id-ID")}`)
        .text(`Total: ${receipt.total.toLocaleString("id-ID")}`)
        .text(`Kembalian: ${receipt.change.toLocaleString("id-ID")}`)
        .text("-".repeat(32))
        .text(receipt.footerNote)
        .text("*** Terima Kasih ***")
        .feed(2)
        .cut()
        .close()
        .then(() => {
          resolve();
        })
        .catch(reject);
    });
  });
}
