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
const DEFAULT_BAUD_RATE = 9600;
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
    // Port hasil pairing Bluetooth biasanya pnpId-nya mengandung "BTHENUM"
    // (Bluetooth Enumerator) — dipakai buat nandain di dropdown pemilihan port.
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
  const printer = new escpos.Printer(device, {});
  return { device, printer };
}
async function printReceiptToSerial(receipt) {
  const settings = getPrinterSettings();
  if (!settings.comPort) {
    throw new Error("Belum ada COM port printer yang dipilih. Atur dulu di Pengaturan Printer.");
  }
  const portName = settings.comPort;
  const { device, printer } = await createPrinter(portName);
  return new Promise((resolve, reject) => {
    device.open((err) => {
      if (err) {
        reject(new Error(`Gagal membuka printer di ${portName}: ${err.message}`));
        return;
      }
      printer.font("a").align("ct").style("b").size(1, 1).text(receipt.storeName).text(receipt.address).text(`Telp. ${receipt.phone}`).text("-".repeat(32)).align("lt").style("normal").size(0, 0).text(`No. ${receipt.transactionId}`).text(receipt.timestamp).text(`Kasir: ${receipt.cashierName}`).text(`Pelanggan: ${receipt.customer}`).text(`Metode: ${receipt.paymentMethod}`).text("-".repeat(32));
      receipt.items.forEach((item) => {
        printer.text(`${item.name}`);
        printer.text(`${item.qty} x ${item.price.toLocaleString("id-ID")} = ${(item.qty * item.price).toLocaleString("id-ID")}`);
      });
      printer.text("-".repeat(32)).text(`Subtotal: ${receipt.subtotal.toLocaleString("id-ID")}`).text(`Diskon: ${receipt.discountAmount.toLocaleString("id-ID")}`).text(`Total: ${receipt.total.toLocaleString("id-ID")}`).text(`Kembalian: ${receipt.change.toLocaleString("id-ID")}`).text("-".repeat(32)).text(receipt.footerNote).text("*** Terima Kasih ***").feed(2).cut().close().then(() => {
        resolve();
      }).catch(reject);
    });
  });
}
exports.getPrinterSettings = getPrinterSettings;
exports.listPrinterPorts = listPrinterPorts;
exports.printReceiptToSerial = printReceiptToSerial;
exports.savePrinterSettings = savePrinterSettings;
