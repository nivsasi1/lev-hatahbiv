// Static re-export of just the 1-D barcode reader, dynamically imported by the
// scanner. Going through a static named import lets the bundler shake the
// library; a dynamic import of the "@zxing/library" barrel would instead pull in
// the whole namespace (QR, Aztec, PDF417, DataMatrix) with it.
export { BrowserBarcodeReader, DecodeHintType, BarcodeFormat } from "@zxing/library";
