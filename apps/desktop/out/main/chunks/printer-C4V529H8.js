"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const DEFAULT_PORT = "COM6";
const DEFAULT_BAUD_RATE = 9600;
async function createPrinter(portName = DEFAULT_PORT) {
  let escposModule;
  let SerialportAdapterCtor;
  try {
    escposModule = await Promise.resolve().then(() => require("./index-BViybyoY.js"));
    SerialportAdapterCtor = (await Promise.resolve().then(() => require("./index-BYWvpG2W.js"))).default;
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
  const { device, printer } = await createPrinter();
  return new Promise((resolve, reject) => {
    device.open((err) => {
      if (err) {
        reject(new Error(`Gagal membuka printer di ${DEFAULT_PORT}: ${err.message}`));
        return;
      }
      [
        receipt.storeName,
        receipt.address,
        `Telp. ${receipt.phone}`,
        "-".repeat(32),
        `No. ${receipt.transactionId}`,
        receipt.timestamp,
        `Kasir: ${receipt.cashierName}`,
        `Pelanggan: ${receipt.customer}`,
        `Metode: ${receipt.paymentMethod}`,
        "-".repeat(32)
      ];
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
exports.printReceiptToSerial = printReceiptToSerial;
