"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("fs");
const path = require("path");
const electron = require("electron");
const THERMAL_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADHAQAAAAB0dSHmAAADYklEQVR4nO2XTYgcRRTHf9UzPTO7O8u0sOAeFrfVBTeIiR68BbcPwRxEWBQ0ip85SC4ehUgkW5EccoyXIHhZIrl4kOhFQSWt4EFB8CIGT2VAXQJi5ct0dtt6Hvpjpmsm4MVb16V75sd79X//qveGUcJdVnA30JKWtKQlLfn/yZVrkYekWI64I42lykl+Z4ByM7PtgDftK7IN6Jmk+a2vOp1FZvyilMQBGHdkEhXiM4AVGI3rKchfGSEMQI1JmS2j9zuAaC/bH5b5FxnSY9WLGYLaY5c5bT1tA4scAUhmVboPBWQecaAe1wCDv3XpRReAHshuIXJBvX0on8hm9N6NNIe0j2RuIkbWDwXnAYiue+6khG9e7NDlCcjUhDtiCD+63AElqLwz6Q4o9Q4AGobNera+WX4FJKlr7VYvvR15hHDvxxiiJgleu/Uc858cBuIGUWc25pIU8kjyhm+ROrc0pyF2ta1VzOKnz4aFcRwfNbTd83R2KwFkvHH5TH5IVVq+60l3bPDCZyphZMiJGzeE+7MPJQFUgGpWurtyeP0kIGCa5K214VkApaqty4f9eO3SOcCM70Wt7acPngLSbt0v1Wl//d4Db2xyTQ/qDUqSfpekty8Dj9ZXriTx4iXzvgVSGDSz3Xh5//cWVmsBdbYOi9vLSgyn44hJd1h48sETZzsioszqZGdJ0vv12zvH+iKC2WgQ1KZkFzdEXE3KfbQcUMPNxxSq7pTqtPkKhyUez4yyYAs4DKBPuUZMwpXKQN9RFJCyQxw0SQwarVlnedgkEcBvENO3TTIghl8KJf4+AJp4PLVqUmgyvFtfxcKKXUSzCht5PY3LmKtQjL+8V5lQkqXXSyN2Omw3SP9o8TQm156CFcBBQq9SXpEYTRZh0mE1lGqNBA6L0f3pSh15BETkPgnBMiLz7huQwzqWrIqpKhYJYZn7uJeFZs+B00RYbk9lEwcxMddZ8ojqJlgMcGxGzBoRBJ/72gJIsKiHvpyqNMagkJOBTwbluf78j1eP6xh1kJGG0KvHdSM5SIbfwZDnKCBhyh2rbGDpGHjYy2Zl4CwuYvoU6IaFwuN+Nrb2ZeBQB7xsw5CXusyfYm7Tr+f8lsgzF+TqBWn0toh8ISJ/vio3ny8/q/Y/YEta0pKWtOQ/kX8BQBj27PdFFIUAAAAASUVORK5CYII=";
const DEFAULT_BAUD_RATE = 9600;
const PAPER_WIDTH_CHARS = 32;
function settingsPath() {
  return path.join(electron.app.getPath("userData"), "printer-settings.json");
}
function getPrinterSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), "utf-8"));
  } catch {
    return { comPort: null };
  }
}
function savePrinterSettings(comPort) {
  const settings = { comPort };
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf-8");
  return settings;
}
async function listPrinterPorts() {
  const { SerialPort } = await import("serialport");
  const ports = await SerialPort.list();
  return ports.map((p) => ({
    path: p.path,
    manufacturer: p.manufacturer,
    isLikelyBluetooth: (p.pnpId || "").toUpperCase().includes("BTHENUM")
  }));
}
async function createPrinter(portName) {
  let escposModule;
  let SerialportAdapterCtor;
  try {
    escposModule = await import("@node-escpos/core");
    SerialportAdapterCtor = (await import("@node-escpos/serialport-adapter")).default;
  } catch (error) {
    throw new Error(`Printer tidak tersedia: ${error.message}`);
  }
  const SerialportAdapter = SerialportAdapterCtor;
  const escpos = escposModule;
  const device = new SerialportAdapter(portName, { baudRate: DEFAULT_BAUD_RATE });
  const printer = new escpos.Printer(device, { width: PAPER_WIDTH_CHARS });
  return { device, printer, escpos };
}
function wrapText(text, maxWidth = PAPER_WIDTH_CHARS) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxWidth) {
      if (current) lines.push(current);
      current = word.length > maxWidth ? word.slice(0, maxWidth) : word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
function printWrapped(printer, text, maxWidth = PAPER_WIDTH_CHARS) {
  wrapText(text, maxWidth).forEach((line) => printer.text(line));
}
function printFallbackLogo(printer) {
  printer.align("ct");
  printer.style("b").size(1, 1);
  printer.text("BY ME");
  printer.style("normal").size(0, 0);
  printer.text("-".repeat(PAPER_WIDTH_CHARS));
}
function rightAlignLine(label, value, width = PAPER_WIDTH_CHARS) {
  const cleanLabel = label.endsWith(":") ? label : `${label}:`;
  const padding = Math.max(0, width - cleanLabel.length - value.length);
  return `${cleanLabel}${" ".repeat(padding)}${value}`;
}
function printItemPriceLine(qty, unitPrice, totalPrice, width = PAPER_WIDTH_CHARS) {
  const left = `${qty} x ${unitPrice.toLocaleString("id-ID")}`;
  const right = totalPrice.toLocaleString("id-ID");
  const padding = Math.max(0, width - left.length - right.length);
  return `${left}${" ".repeat(padding)}${right}`;
}
async function printReceiptToSerial(receipt) {
  const settings = getPrinterSettings();
  if (!settings.comPort) {
    throw new Error("Belum ada COM port printer yang dipilih. Atur dulu di Pengaturan Printer.");
  }
  const portName = settings.comPort;
  const { device, printer, escpos } = await createPrinter(portName);
  return new Promise((resolve, reject) => {
    device.open(async (err) => {
      if (err) {
        reject(new Error(`Gagal membuka printer di ${portName}: ${err.message}`));
        return;
      }
      try {
        printer.align("ct");
        if (receipt.showLogo !== false) {
          try {
            const logoImage = await escpos.Image.load(THERMAL_LOGO_BASE64, "image/png");
            printer.raster(logoImage, "normal");
          } catch (logoErr) {
            console.error("[printer] Gagal cetak logo raster, pakai fallback teks:", logoErr);
            try {
              printFallbackLogo(printer);
            } catch (fallbackErr) {
              console.error("[printer] Fallback logo teks gagal juga:", fallbackErr);
            }
          }
        }
        printer.style("b").size(1, 1);
        printWrapped(printer, receipt.storeName);
        printer.style("normal").size(0, 0);
        printWrapped(printer, receipt.address);
        printWrapped(printer, `Telp. ${receipt.phone}`);
        printer.text("-".repeat(PAPER_WIDTH_CHARS));
        printer.align("lt");
        printer.text(rightAlignLine("No", receipt.transactionId));
        printer.text(rightAlignLine("Tanggal", receipt.timestamp));
        printer.text(rightAlignLine("Kasir", receipt.cashierName));
        printer.text(rightAlignLine("Pelanggan", receipt.customer));
        printer.text(rightAlignLine("Metode", receipt.paymentMethod));
        printer.text("-".repeat(PAPER_WIDTH_CHARS));
        receipt.items.forEach((item) => {
          printWrapped(printer, item.name);
          printer.text(
            printItemPriceLine(item.qty, item.price, item.qty * item.price)
          );
        });
        printer.text("-".repeat(PAPER_WIDTH_CHARS)).text(rightAlignLine("Subtotal", receipt.subtotal.toLocaleString("id-ID"))).text(rightAlignLine("Diskon", receipt.discountAmount.toLocaleString("id-ID"))).text(rightAlignLine("Total", receipt.total.toLocaleString("id-ID"))).text(rightAlignLine("Kembalian", receipt.change.toLocaleString("id-ID"))).text("-".repeat(PAPER_WIDTH_CHARS));
        printer.align("ct");
        printWrapped(printer, receipt.footerNote);
        printer.text("*** Terima Kasih ***");
        await printer.feed(2).cut().close();
        resolve();
      } catch (printErr) {
        reject(new Error(`Gagal mengirim data ke printer: ${printErr.message}`));
      }
    });
  });
}
exports.getPrinterSettings = getPrinterSettings;
exports.listPrinterPorts = listPrinterPorts;
exports.printReceiptToSerial = printReceiptToSerial;
exports.savePrinterSettings = savePrinterSettings;
